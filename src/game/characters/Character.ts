// Procedural cartoon characters built from a Look (see content/npcs.ts), with simple
// walk / idle / talk / wave animations. No external assets.
import * as THREE from "three";
import type { Look } from "../../content/npcs";

const toon = new Map<string, THREE.MeshToonMaterial>();
let gradient: THREE.DataTexture | null = null;
function gradientMap() {
  if (!gradient) {
    const data = new Uint8Array([90, 90, 90, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
    gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}
export function toonMat(color: string) {
  let m = toon.get(color);
  if (!m) { m = new THREE.MeshToonMaterial({ color: new THREE.Color(color), gradientMap: gradientMap() }); toon.set(color, m); }
  return m;
}

function shade(hex: string, f: number) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return "#" + c.getHexString();
}

export type Anim = "idle" | "walk" | "run" | "talk" | "wave" | "sit";

export class Character {
  root = new THREE.Group();
  private body = new THREE.Group();
  private head = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private t = Math.random() * 10;
  anim: Anim = "idle";
  talking = 0;
  speed = 0;
  seated = false;
  height: number;
  private blinkT = 2 + Math.random() * 3;
  private eyes: THREE.Mesh[] = [];
  private mouth!: THREE.Mesh;
  /** The cheeks: the one material that is this character's own (the toonMat ones are shared). */
  private blush = new THREE.MeshBasicMaterial({ color: "#f19a9a", transparent: true, opacity: 0.45 });

  constructor(public look: Look) {
    const h = look.height ?? 1;
    const b = look.build ?? 1;
    this.height = 1.75 * h;
    const skin = toonMat(look.skin);
    const top = toonMat(look.top);
    const bottom = toonMat(look.bottom);
    const shoes = toonMat(look.shoes ?? "#3a2f2a");
    const hairM = toonMat(look.hair.color);
    const acc = look.acc || [];

    this.root.add(this.body);
    // legs
    const legGeo = new THREE.CapsuleGeometry(0.1 * b, 0.42 * h, 4, 8).translate(0, -0.3 * h, 0);
    const shoeGeo = new THREE.BoxGeometry(0.17 * b, 0.1, 0.28).translate(0, -0.6 * h, 0.05);
    for (const [leg, x] of [[this.legL, -0.12 * b], [this.legR, 0.12 * b]] as [THREE.Group, number][]) {
      leg.position.set(x, 0.66 * h, 0);
      const m = new THREE.Mesh(legGeo, look.skirt ? skin : bottom);
      const s = new THREE.Mesh(shoeGeo, shoes);
      m.castShadow = s.castShadow = true;
      leg.add(m, s);
      this.body.add(leg);
    }
    // torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25 * b, 0.36 * h, 6, 12), top);
    torso.position.y = 0.98 * h;
    torso.scale.set(1, 1, 0.78);
    torso.castShadow = true;
    this.body.add(torso);
    // hips / skirt
    if (look.skirt) {
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * b, 0.34 * b, 0.36 * h, 14), bottom);
      skirt.position.y = 0.66 * h;
      skirt.castShadow = true;
      this.body.add(skirt);
    } else {
      const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.23 * b, 0.1, 4, 10), bottom);
      hips.position.y = 0.72 * h;
      hips.scale.set(1, 1, 0.78);
      this.body.add(hips);
    }
    // arms
    const armGeo = new THREE.CapsuleGeometry(0.075 * b, 0.36 * h, 4, 8).translate(0, -0.24 * h, 0);
    const handGeo = new THREE.SphereGeometry(0.075 * b, 8, 6).translate(0, -0.5 * h, 0);
    for (const [arm, x] of [[this.armL, -0.33 * b], [this.armR, 0.33 * b]] as [THREE.Group, number][]) {
      arm.position.set(x, 1.2 * h, 0);
      const m = new THREE.Mesh(armGeo, acc.includes("cardigan") ? toonMat(look.accColor ?? "#e8c07a") : top);
      const hand = new THREE.Mesh(handGeo, skin);
      m.castShadow = true;
      arm.add(m, hand);
      this.body.add(arm);
    }
    // neck & head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8), skin);
    neck.position.y = 1.3 * h;
    this.body.add(neck);
    this.head.position.y = 1.52 * h;
    this.body.add(this.head);
    const headR = 0.27;
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(headR, 20, 16), skin);
    headMesh.scale.set(1, 1.02, 0.96);
    headMesh.castShadow = true;
    this.head.add(headMesh);
    // face
    const eyeMat = toonMat("#231a14");
    for (const x of [-0.095, 0.095]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeMat);
      e.position.set(x, 0.03, headR * 0.92);
      e.scale.set(1, 1.25, 0.6);
      this.head.add(e);
      this.eyes.push(e);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 4), toonMat("#ffffff"));
      shine.position.set(x + 0.012, 0.045, headR * 0.95);
      this.head.add(shine);
      const blush = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), this.blush);
      blush.position.set(x * 1.55, -0.05, headR * 0.86);
      blush.rotation.y = x > 0 ? 0.55 : -0.55;
      this.head.add(blush);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), toonMat(shade(look.skin, 0.9)));
    nose.position.set(0, -0.03, headR * 0.98);
    this.head.add(nose);
    this.mouth = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12, Math.PI), toonMat("#8a3b3b"));
    this.mouth.position.set(0, -0.1, headR * 0.9);
    this.mouth.rotation.z = Math.PI;
    this.head.add(this.mouth);
    for (const x of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), skin);
      ear.position.set(x * headR * 0.98, 0, 0);
      ear.scale.set(0.6, 1, 0.8);
      this.head.add(ear);
    }
    this.buildHair(look, hairM, headR);
    this.buildAccessories(look, acc, headR, h, b);
    this.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
  }

  private buildHair(look: Look, hairM: THREE.Material, R: number) {
    const s = look.hair.style;
    const add = (g: THREE.BufferGeometry, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
      const m = new THREE.Mesh(g, hairM);
      m.position.set(x, y, z); m.scale.set(sx, sy, sz);
      this.head.add(m);
      return m;
    };
    if (s === "bald") {
      add(new THREE.SphereGeometry(R * 1.02, 16, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.25), 0, 0, -0.02);
      return;
    }
    // cap of hair covering the top/back of the head
    const capGeo = new THREE.SphereGeometry(R * 1.06, 20, 12, 0, Math.PI * 2, 0, Math.PI * (s === "buzz" ? 0.42 : 0.5));
    add(capGeo, 0, 0.02, -0.015);
    if (s !== "buzz") add(new THREE.SphereGeometry(R * 1.05, 16, 10, Math.PI * 0.15, Math.PI * 1.7, Math.PI * 0.3, Math.PI * 0.45), 0, -0.02, -0.03).rotation.y = Math.PI;
    if (s === "short" || s === "side") {
      const fringe = add(new THREE.SphereGeometry(R * 0.9, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.3), s === "side" ? 0.06 : 0, 0.13, 0.08);
      fringe.rotation.z = s === "side" ? -0.35 : 0;
    }
    if (s === "long" || s === "wavy") {
      add(new THREE.CapsuleGeometry(R * 0.85, 0.35, 6, 12), 0, -0.2, -0.1, 1.15, 1, 0.55);
      if (s === "wavy") for (const x of [-0.2, 0.2]) add(new THREE.SphereGeometry(0.1, 8, 6), x, -0.28, 0.02);
    }
    if (s === "bob") add(new THREE.CylinderGeometry(R * 1.08, R * 1.12, 0.28, 18, 1, true), 0, -0.1, -0.01);
    if (s === "bun") add(new THREE.SphereGeometry(0.12, 12, 10), 0, 0.2, -0.2);
    if (s === "ponytail") {
      add(new THREE.SphereGeometry(0.07, 8, 6), 0, 0.08, -0.27);
      add(new THREE.CapsuleGeometry(0.07, 0.25, 4, 8), 0, -0.12, -0.32).rotation.x = 0.35;
    }
    if (s === "curly") for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      add(new THREE.SphereGeometry(0.1, 8, 6), Math.cos(a) * R * 0.9, 0.08 + Math.sin(i) * 0.06, Math.sin(a) * R * 0.85 - 0.05);
    }
  }

  private buildAccessories(look: Look, acc: string[], R: number, h: number, b: number) {
    const ac = toonMat(look.accColor ?? "#2f7d6b");
    if (acc.includes("glasses") || acc.includes("sunglasses")) {
      const gm = acc.includes("sunglasses") ? toonMat("#1a1a1a") : toonMat("#3a3a3a");
      for (const x of [-0.095, 0.095]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 14), gm);
        ring.position.set(x, 0.03, R * 0.97);
        this.head.add(ring);
        if (acc.includes("sunglasses")) {
          const lens = new THREE.Mesh(new THREE.CircleGeometry(0.052, 12), gm);
          lens.position.set(x, 0.03, R * 0.975);
          this.head.add(lens);
        }
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.012), gm);
      bridge.position.set(0, 0.04, R * 0.99);
      this.head.add(bridge);
    }
    if (acc.includes("beard")) {
      const beard = new THREE.Mesh(new THREE.SphereGeometry(R * 0.78, 14, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.4), toonMat(look.hair.color));
      beard.position.set(0, -0.02, 0.04);
      this.head.add(beard);
    }
    if (acc.includes("mustache")) {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.1, 4, 6), toonMat(look.hair.color === "#e8e4dc" ? "#cfcac2" : look.hair.color));
      m.rotation.z = Math.PI / 2;
      m.position.set(0, -0.07, R * 0.95);
      this.head.add(m);
    }
    if (acc.includes("cap")) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), ac);
      cap.position.y = 0.03;
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 14, 1, false, -Math.PI / 2, Math.PI), ac);
      brim.position.set(0, 0.12, 0.2);
      this.head.add(cap, brim);
    }
    if (acc.includes("hat") || acc.includes("police") || acc.includes("pilot")) {
      const c = acc.includes("police") ? toonMat("#1d2940") : ac;
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.95, R * 1.02, 0.14, 18), c);
      hat.position.y = 0.2;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.12, R * 0.95, 0.08, 18), c);
      top.position.y = 0.3;
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 14, 1, false, -Math.PI / 2, Math.PI), toonMat("#111111"));
      brim.position.set(0, 0.14, 0.19);
      this.head.add(hat, top, brim);
      if (acc.includes("police")) {
        const badge = new THREE.Mesh(new THREE.CircleGeometry(0.035, 6), toonMat("#e2c044"));
        badge.position.set(0, 0.22, R * 1.0);
        this.head.add(badge);
      }
    }
    if (acc.includes("headset")) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(R * 1.05, 0.015, 6, 20, Math.PI), toonMat("#2b2b2b"));
      band.position.y = 0.02;
      const mic = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.16, 3, 6), toonMat("#2b2b2b"));
      mic.position.set(R * 0.75, -0.1, 0.13); mic.rotation.z = 1.2; mic.rotation.y = 0.6;
      this.head.add(band, mic);
    }
    if (acc.includes("earrings")) for (const x of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), toonMat("#e2c044"));
      e.position.set(x * R * 0.98, -0.08, 0.02);
      this.head.add(e);
    }
    if (acc.includes("apron")) {
      const ap = new THREE.Mesh(new THREE.BoxGeometry(0.42 * b, 0.62 * h, 0.03), ac);
      ap.position.set(0, 0.86 * h, 0.21 * b);
      this.body.add(ap);
    }
    if (acc.includes("tie") || acc.includes("bowtie")) {
      const tie = acc.includes("bowtie")
        ? new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.03), ac)
        : new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.02), ac);
      tie.position.set(0, acc.includes("bowtie") ? 1.25 * h : 1.08 * h, 0.2 * b);
      this.body.add(tie);
    }
    if (acc.includes("vest")) {
      const v = new THREE.Mesh(new THREE.CapsuleGeometry(0.265 * b, 0.3 * h, 4, 10), toonMat(look.accColor ?? "#6d8f3e"));
      v.position.y = 0.98 * h; v.scale.set(1, 1, 0.8);
      this.body.add(v);
    }
    if (acc.includes("scarf")) {
      const sc = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 8, 14), ac);
      sc.rotation.x = Math.PI / 2; sc.position.y = 1.29 * h;
      this.body.add(sc);
    }
    if (acc.includes("badge") || acc.includes("lanyard")) {
      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.01), toonMat("#ffffff"));
      badge.position.set(acc.includes("lanyard") ? 0 : 0.12, acc.includes("lanyard") ? 1.0 * h : 1.14 * h, 0.21 * b);
      this.body.add(badge);
    }
    if (acc.includes("flower")) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), toonMat("#e84a5f"));
      f.position.set(-0.18, 0.15, 0.1);
      this.head.add(f);
    }
  }

  setAnim(a: Anim) { this.anim = a; }

  update(dt: number) {
    this.t += dt;
    const t = this.t;
    let legA = 0, armA = 0, bob = 0, lean = 0, headNod = 0, headTurn = 0;
    if (this.anim === "walk" || this.anim === "run") {
      const f = this.anim === "run" ? 11 : 7.5;
      const amp = this.anim === "run" ? 0.75 : 0.55;
      legA = Math.sin(t * f) * amp;
      armA = -legA * 0.9;
      bob = Math.abs(Math.sin(t * f)) * 0.05;
      lean = this.anim === "run" ? 0.12 : 0.04;
    } else if (this.anim === "sit") {
      // seated pose
    } else {
      bob = Math.sin(t * 2) * 0.008;
      headTurn = Math.sin(t * 0.5) * 0.08;
    }
    if (this.talking > 0) {
      this.talking -= dt;
      headNod = Math.sin(t * 9) * 0.05;
      this.armR.rotation.z = -0.15 - Math.max(0, Math.sin(t * 3)) * 0.25;
      this.armR.rotation.x = -0.3 - Math.sin(t * 3) * 0.2;
      this.mouth.scale.y = 0.6 + Math.abs(Math.sin(t * 14)) * 1.4;
    } else {
      this.armR.rotation.z = 0;
      this.mouth.scale.y = 1;
    }
    if (this.anim === "wave") {
      this.armR.rotation.z = -2.6 + Math.sin(t * 10) * 0.3;
      this.armR.rotation.x = 0;
    }
    if (this.anim === "sit") {
      this.legL.rotation.x = this.legR.rotation.x = -1.45;
      this.body.position.y = -0.36 * (this.look.height ?? 1);
      this.armL.rotation.x = -0.5;
      if (this.talking <= 0) this.armR.rotation.x = -0.5;
    } else {
      this.legL.rotation.x = legA;
      this.legR.rotation.x = -legA;
      this.armL.rotation.x = armA;
      if (this.talking <= 0 && this.anim !== "wave") this.armR.rotation.x = -armA;
      this.body.position.y = bob;
    }
    this.body.rotation.x = lean;
    this.head.rotation.x = headNod;
    this.head.rotation.y = headTurn;
    // blinking
    this.blinkT -= dt;
    const closed = this.blinkT < 0.12;
    for (const e of this.eyes) e.scale.y = closed ? 0.15 : 1.25;
    if (this.blinkT < 0) this.blinkT = 2.5 + Math.random() * 3.5;
  }

  talk(seconds: number) { this.talking = Math.max(this.talking, seconds); }

  /** Frees the GPU memory only this character uses: every geometry (all built per character) and the
   *  blush material. NPCs are rebuilt on every zone change. The shared toonMat materials stay. */
  dispose() {
    const geos = new Set<THREE.BufferGeometry>();
    this.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) geos.add((o as THREE.Mesh).geometry); });
    for (const g of geos) g.dispose();
    this.blush.dispose();
  }
}
