// Procedural cartoon characters built from a Look (see content/npcs.ts), with simple
// walk / idle / talk / wave / sit animations. No external assets.
// Each moving part (body, head, arms, thighs, shins, eyes, brows, mouth) is one vertex-coloured mesh merged
// from simple shapes, so a character costs about a dozen draw calls, and the face details cast no shadows.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Look } from "../../content/npcs";

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
let material: THREE.MeshToonMaterial | null = null;
/** One toon material for every character: the colours are in the vertices. */
function charMaterial() {
  return (material ??= new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() }));
}

const _c = new THREE.Color();
/** Simple shapes merged into one vertex-coloured mesh (one draw call). */
class Parts {
  private geos: THREE.BufferGeometry[] = [];
  add(g: THREE.BufferGeometry, color: THREE.ColorRepresentation) {
    _c.set(color);
    for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i += 3) { col[i] = _c.r; col[i + 1] = _c.g; col[i + 2] = _c.b; }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.geos.push(g);
  }
  mesh(castShadow = true) {
    const g = this.geos.length > 1 ? mergeGeometries(this.geos, false)! : this.geos[0];
    if (this.geos.length > 1) for (const x of this.geos) x.dispose();
    const m = new THREE.Mesh(g, charMaterial());
    m.castShadow = castShadow;
    return m;
  }
}

/** The lightest skin tones a little warmer and deeper than the flat colour: under the bright toon light they washed
 *  out to white, while the illustrated pictures show them peachy. Darker tones stay as they are. */
function skinTone(hex: string) {
  const c = new THREE.Color(hex), hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  if (hsl.l > 0.55) c.setHSL(hsl.h - 0.006, Math.min(1, hsl.s * 1.18), hsl.l - (hsl.l - 0.55) * 0.3);
  return c;
}
/** Eyebrows: the hair colour, dark enough to read on any face (grey ones for white hair). */
function browColor(hair: string) {
  const c = new THREE.Color(hair), hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return c.setHSL(hsl.h, hsl.s * 0.9, Math.min(hsl.l * 0.72, 0.16));
}
/** Rosy cheeks: a touch of pink, a little less on darker skin. */
function blushColor(skin: THREE.Color) {
  const c = skin.clone(), hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return c.lerp(new THREE.Color("#ff7a7a"), hsl.l > 0.45 ? 0.3 : 0.2);
}

// ---- the face: the head is a ball (radius HR, a little taller than deep), and the features are laid onto it
const HR = 0.27;
const HA = HR, HB = HR * 1.02, HC = HR * 0.96;
const EYE_X = 0.095, EYE_Y = 0.03, BROW_Y = 0.112, MOUTH_Y = -0.098;
const _n = new THREE.Vector3(), _q = new THREE.Quaternion(), _z = new THREE.Vector3(0, 0, 1);
/** The point on the face in front of (x, y) and its outward normal (into _n). */
function facePoint(x: number, y: number) {
  const z = HC * Math.sqrt(Math.max(0, 1 - (x / HA) ** 2 - (y / HB) ** 2));
  _n.set(x / (HA * HA), y / (HB * HB), z / (HC * HC)).normalize();
  return z;
}
/** A shape built facing +Z, laid onto the face at (x, y): turned with the surface, `lift` out along it. */
function onFace(g: THREE.BufferGeometry, x: number, y: number, lift = 0) {
  const z = facePoint(x, y);
  g.applyQuaternion(_q.setFromUnitVectors(_z, _n));
  return g.translate(x + _n.x * lift, y + _n.y * lift, z + _n.z * lift);
}
/** Puts an object (a group of face parts built facing +Z) onto the face the same way. */
function placeOnFace(o: THREE.Object3D, x: number, y: number, lift = 0) {
  const z = facePoint(x, y);
  o.quaternion.setFromUnitVectors(_z, _n);
  o.position.set(x + _n.x * lift, y + _n.y * lift, z + _n.z * lift);
}
/** Hair over the top of the head: a sphere segment `len` (radians) down from the crown, tipped back by
 *  `tilt` so the forehead stays free (the back reaches down to the nape). */
function hairCap(k: number, tilt: number, len = Math.PI / 2) {
  return new THREE.SphereGeometry(HR * k, 24, 12, 0, Math.PI * 2, 0, len).scale(1, 1.02, 0.97).rotateX(-tilt).translate(0, 0.012, -0.012);
}

/** A shell round the head (radius HR·k) between the angles phi0…phi1 round it (0 = the left side, π/2 = the
 *  face) and from `top(phi)` down to `bottom` (radians from the crown): a beard whose edge rises to the ears. */
function headShell(k: number, phi0: number, phi1: number, top: (phi: number) => number, bottom: number, wSeg = 24, hSeg = 7) {
  const pos: number[] = [], idx: number[] = [], r = HR * k;
  for (let j = 0; j <= hSeg; j++) for (let i = 0; i <= wSeg; i++) {
    const ph = phi0 + (i / wSeg) * (phi1 - phi0), t0 = top(ph), th = t0 + (j / hSeg) * (bottom - t0);
    pos.push(-r * Math.cos(ph) * Math.sin(th), r * Math.cos(th) * 1.02, r * Math.sin(ph) * Math.sin(th) * 0.97);
  }
  for (let j = 0; j < hSeg; j++) for (let i = 0; i < wSeg; i++) {
    const a = j * (wSeg + 1) + i, b = a + wSeg + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export type Anim = "idle" | "walk" | "run" | "talk" | "wave" | "sit";

/** Sitting, the thighs slope down this much from the hip (radians), and the shins hang straight down. */
const SIT_DROOP = 0.1;

let blobGeo: THREE.PlaneGeometry | null = null, blobMat: THREE.MeshBasicMaterial | null = null;
/** A soft round shadow under the feet (one shared geometry and material). */
function blobShadow() {
  if (!blobMat) {
    // a dark disc that fades out towards its edge (made from numbers, so it needs no canvas)
    const S = 32, px = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const r = Math.hypot(x - S / 2 + 0.5, y - S / 2 + 0.5) / (S / 2), i = (y * S + x) * 4;
      px[i] = 20; px[i + 1] = 28; px[i + 2] = 30; px[i + 3] = Math.round(140 * Math.max(0, 1 - r) ** 1.5);
    }
    const tex = new THREE.DataTexture(px, S, S, THREE.RGBAFormat);
    tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    blobMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  }
  const m = new THREE.Mesh(blobGeo!, blobMat);
  m.position.y = 0.015;
  m.renderOrder = -1;
  return m;
}

export class Character {
  /** Soft round shadows under the feet: on when the sun casts none (the „Paprasta“ quality). */
  static blobShadows = false;
  root = new THREE.Group();
  private body = new THREE.Group();
  private head = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private shinL = new THREE.Group();
  private shinR = new THREE.Group();
  /** The skirt hangs from the waist (shortened while sitting, so it stays out of the seat). */
  private skirt: THREE.Mesh | null = null;
  private eyes = new THREE.Group();
  private shine!: THREE.Mesh;
  private brows!: THREE.Mesh;
  private smile!: THREE.Mesh;
  private mouth!: THREE.Mesh;
  /** The shins with their feet: standing, and longer ones for sitting (built when the character first sits). */
  private shins: THREE.Mesh[] = [];
  private seatShins: THREE.Mesh[] | null = null;
  private seatShinExtra = 0;
  private legLook!: { h: number; b: number; shin: THREE.ColorRepresentation; shoes: string; skin: THREE.ColorRepresentation; flipflops: boolean };
  /** While talking: how loud the voice is right now (0–1; -1 once it has ended), or null with no recording to follow. */
  private level: (() => number | null) | null = null;
  private mouthOpen = 0;
  private browLift = 0;
  /** A short reaction to the learner's answer: a nod (understood) or a puzzled tilt (not understood). */
  private reaction: { kind: "nod" | "puzzled"; t: number } | null = null;
  private t = Math.random() * 10;
  anim: Anim = "idle";
  talking = 0;
  speed = 0;
  /** How fast the character really moves (m/s): the steps keep pace with it, so the feet don't slide. */
  moveSpeed = 0;
  /** Leaning sideways into a turn (radians, + to the left). */
  bank = 0;
  private walkPhase = 0;
  private blob: THREE.Mesh;
  seated = false;
  /** Height of the seat top when sitting (chairs and benches in the town are about half a metre). */
  seatY = 0.5;
  height: number;
  private blinkT = 2 + Math.random() * 3;

  constructor(public look: Look) {
    const h = look.height ?? 1;
    const b = look.build ?? 1;
    this.height = 1.75 * h;
    const acc = look.acc || [];
    this.root.add(this.body);
    this.blob = blobShadow();
    this.blob.scale.setScalar(0.95 * b);
    this.root.add(this.blob);
    this.buildBody(look, acc, h, b);
    this.body.add(this.head);
    this.head.position.y = 1.52 * h;
    this.buildHead(look, acc);
  }

  // ------------------------------------------------------------------ body

  private buildBody(look: Look, acc: string[], h: number, b: number) {
    const skin = skinTone(look.skin), top = look.top, bottom = look.bottom, shoes = look.shoes ?? "#3a2f2a";
    const ac = look.accColor ?? "#2f7d6b";
    const P = new Parts();
    // torso; trousers from the waist down (they follow the torso's rounded bottom)
    const tr = 0.25 * b, waist = 0.86 * h;
    P.add(new THREE.CapsuleGeometry(tr, 0.36 * h, 6, 14).scale(1, 1, 0.78).translate(0, 0.98 * h, 0), top);
    if (!look.skirt) {
      const r = tr + 0.006, prof: THREE.Vector2[] = [];
      for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); prof.push(new THREE.Vector2(Math.max(1e-3, r * Math.cos(a)), 0.8 * h + r * Math.sin(a))); }
      prof.push(new THREE.Vector2(r, waist));
      P.add(new THREE.LatheGeometry(prof, 16).scale(1, 1, 0.78), bottom);
    } else {
      // a flared skirt from the waist, on its own mesh (see sit)
      const sk = new Parts();
      sk.add(new THREE.CylinderGeometry(tr + 0.012, 0.34 * b, 0.38 * h, 16).scale(1, 1, 0.84).translate(0, -0.19 * h, 0), bottom);
      this.skirt = sk.mesh();
      this.skirt.position.y = waist;
      this.body.add(this.skirt);
    }
    // neck
    P.add(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 10).translate(0, 1.3 * h, 0), skin);
    // ---- clothes and things worn on the body
    const front = (y: number) => {
      // the torso's front surface at height y (its rounded top above 1.16 h)
      const dy = Math.max(0, y - 1.16 * h);
      return Math.sqrt(Math.max(0, tr * tr - dy * dy)) * 0.78;
    };
    if (acc.includes("apron")) {
      // a panel curving round the front, from the shins' top to the chest
      const y0 = 0.5 * h, y1 = 1.18 * h;
      P.add(new THREE.CylinderGeometry(tr + 0.012, tr + 0.03, y1 - y0, 14, 1, true, -0.95, 1.9).scale(1, 1, 0.8).translate(0, (y0 + y1) / 2, 0), ac);
      P.add(new THREE.TorusGeometry(tr + 0.014, 0.012, 4, 20).rotateX(Math.PI / 2).scale(1, 1, 0.8).translate(0, 0.9 * h, 0), ac);
    }
    if (acc.includes("vest") || acc.includes("cardigan")) {
      // open at the front, so the top shows
      const r = tr + 0.012, prof: THREE.Vector2[] = [];
      prof.push(new THREE.Vector2(r + 0.004, waist - 0.07));
      for (let i = 0; i <= 5; i++) { const a = (i / 5) * 1.05; prof.push(new THREE.Vector2(Math.max(0.06, r * Math.cos(a)), 1.16 * h + r * Math.sin(a))); }
      const c = acc.includes("cardigan") ? ac : look.accColor ?? "#6d8f3e";
      P.add(new THREE.LatheGeometry(prof, 18, 0.32, Math.PI * 2 - 0.64).scale(1, 1, 0.8), c);
    }
    if (acc.includes("tie")) {
      const ty = 1.08 * h;
      P.add(new THREE.BoxGeometry(0.06, 0.3, 0.016).translate(0, ty - 0.02, front(ty) + 0.008), ac);
      P.add(new THREE.BoxGeometry(0.075, 0.05, 0.03).translate(0, 1.25 * h, front(1.25 * h) + 0.01), ac);
    }
    if (acc.includes("bowtie")) {
      const by = 1.26 * h, bz = front(by) + 0.02;
      for (const s of [-1, 1]) P.add(new THREE.ConeGeometry(0.035, 0.07, 8).rotateZ(-s * Math.PI / 2).translate(s * 0.035, by, bz), ac);
      P.add(new THREE.SphereGeometry(0.018, 8, 6).translate(0, by, bz + 0.004), ac);
    }
    if (acc.includes("scarf")) {
      P.add(new THREE.TorusGeometry(0.13, 0.05, 8, 16).rotateX(Math.PI / 2).translate(0, 1.29 * h, 0.01), ac);
      P.add(new THREE.CapsuleGeometry(0.035, 0.16, 3, 8).scale(1.2, 1, 0.5).rotateZ(0.12).translate(0.07, 1.13 * h, front(1.13 * h) + 0.02), ac);
    }
    if (acc.includes("badge") && !acc.includes("lanyard")) {
      const y = 1.14 * h;
      P.add(new THREE.BoxGeometry(0.08, 0.055, 0.012).translate(0.12, y, front(y) + 0.005), acc.includes("police") ? "#e2c044" : "#ffffff");
    }
    if (acc.includes("lanyard")) {
      const y = 1.02 * h;
      P.add(new THREE.BoxGeometry(0.075, 0.095, 0.012).translate(0, y, front(y) + 0.006), "#ffffff");
      // the strap, from the badge up round the neck
      for (const s of [-1, 1]) {
        const a = new THREE.Vector3(s * 0.025, y + 0.045, front(y) + 0.008), e = new THREE.Vector3(s * 0.085, 1.3 * h, front(1.3 * h) * 0.7 + 0.02);
        const d = e.clone().sub(a), len = d.length();
        const g = new THREE.CylinderGeometry(0.006, 0.006, len, 4).translate(0, len / 2, 0);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
        P.add(g.translate(a.x, a.y, a.z), "#2c5d8a");
      }
    }
    const torso = P.mesh();
    this.body.add(torso);

    // legs: a thigh from the hip, a shin with the shoe from the knee (they bend for walking and sitting)
    const bare = look.skirt || look.shorts;
    const legC = bare ? skin : bottom;
    this.legLook = { h, b, shin: legC, shoes, skin, flipflops: !!look.flipflops };
    for (const [leg, shin, x] of [[this.legL, this.shinL, -0.12 * b], [this.legR, this.shinR, 0.12 * b]] as [THREE.Group, THREE.Group, number][]) {
      leg.position.set(x, 0.66 * h, 0);
      const T = new Parts();
      T.add(new THREE.CapsuleGeometry(0.1 * b, 0.21 * h, 4, 10).translate(0, -0.195 * h, 0), legC);
      // shorts: a wide leg over the upper thigh
      if (look.shorts) T.add(new THREE.CylinderGeometry(0.118 * b, 0.124 * b, 0.22 * h, 12).translate(0, -0.12 * h, 0), bottom);
      leg.add(T.mesh());
      shin.position.y = -0.3 * h;
      const m = this.shinMesh(0);
      this.shins.push(m);
      shin.add(m);
      leg.add(shin);
      this.body.add(leg);
    }
    // arms (cardigan sleeves in its colour)
    const sleeve = acc.includes("cardigan") ? ac : top;
    for (const [arm, x] of [[this.armL, -0.33 * b], [this.armR, 0.33 * b]] as [THREE.Group, number][]) {
      arm.position.set(x, 1.2 * h, 0);
      const A = new Parts();
      A.add(new THREE.CapsuleGeometry(0.075 * b, 0.36 * h, 4, 8).translate(0, -0.24 * h, 0), sleeve);
      A.add(new THREE.SphereGeometry(0.075 * b, 10, 8).translate(0, -0.5 * h, 0), skin);
      arm.add(A.mesh());
      this.body.add(arm);
    }
  }

  /** One shin with its foot, `extra` longer than a standing one (seated feet reach the floor). */
  private shinMesh(extra: number) {
    const { h, b, shin, shoes, skin, flipflops } = this.legLook;
    const S = new Parts();
    S.add(new THREE.CapsuleGeometry(0.096 * b, 0.21 * h + extra, 4, 10).translate(0, -0.105 * h - extra / 2, 0), shin);
    const y = -0.3 * h - extra;
    if (flipflops) {
      // a sole, the bare foot on it and a strap across
      S.add(new THREE.BoxGeometry(0.17 * b, 0.03, 0.28).translate(0, y - 0.035, 0.05), shoes);
      S.add(new THREE.BoxGeometry(0.12 * b, 0.06, 0.22).translate(0, y + 0.01, 0.04), skin);
      S.add(new THREE.BoxGeometry(0.135 * b, 0.016, 0.035).translate(0, y + 0.042, 0.08), new THREE.Color(shoes).multiplyScalar(0.55));
    } else S.add(new THREE.BoxGeometry(0.17 * b, 0.1, 0.28).translate(0, y, 0.05), shoes);
    return S.mesh();
  }

  // ------------------------------------------------------------------ head and face

  private buildHead(look: Look, acc: string[]) {
    const skin = skinTone(look.skin), hair = look.hair.color, style = look.hair.style;
    const R = HR;
    const P = new Parts();
    P.add(new THREE.SphereGeometry(R, 24, 18).scale(1, 1.02, 0.96), skin);
    // ears (long hair covers them)
    const covered = style === "long" || style === "wavy" || style === "bob";
    if (!covered) for (const s of [-1, 1]) P.add(new THREE.SphereGeometry(0.05, 10, 7).scale(0.6, 1, 0.8).translate(s * R * 0.98, -0.02, -0.005), skin);
    // nose and cheeks
    P.add(onFace(new THREE.SphereGeometry(0.027, 10, 7).scale(1.05, 0.85, 0.75), 0, -0.035, 0.006), skin.clone().multiplyScalar(0.88));
    const blush = blushColor(skin);
    for (const s of [-1, 1]) P.add(onFace(new THREE.SphereGeometry(0.037, 12, 6).scale(1, 0.62, 0.22), s * 0.15, -0.058, -0.0015), blush);
    this.buildHair(P, look, acc);
    this.buildHeadwear(P, look, acc);
    this.head.add(P.mesh());

    // eyes: dark ovals that blink (the group squashes them); the highlights are their own mesh, hidden meanwhile
    const E = new Parts(), L = new Parts();
    for (const s of [-1, 1]) {
      const x = s * EYE_X;
      E.add(onFace(new THREE.SphereGeometry(0.035, 14, 10).scale(1, 1.25, 0.6), x, EYE_Y, -0.007), "#231a14");
      // the highlights sit on the eye's front, upper left and a small one lower right (the sun is to the left)
      const front = (dx: number, dy: number) => 0.021 * Math.sqrt(Math.max(0, 1 - (dx / 0.035) ** 2 - (dy / 0.04375) ** 2)) - 0.007;
      L.add(onFace(new THREE.SphereGeometry(0.0115, 8, 6).scale(1, 1, 0.45).translate(-0.011, 0.016, front(-0.011, 0.016)), x, EYE_Y), "#ffffff");
      L.add(onFace(new THREE.SphereGeometry(0.0055, 6, 4).scale(1, 1, 0.45).translate(0.012, -0.017, front(0.012, -0.017)), x, EYE_Y), "#ffffff");
    }
    const eyeMesh = E.mesh(false);
    this.shine = L.mesh(false);
    for (const m of [eyeMesh, this.shine]) { m.geometry.translate(0, -EYE_Y, 0); this.eyes.add(m); }
    this.eyes.position.y = EYE_Y;
    this.head.add(this.eyes);

    // eyebrows: soft arches in the hair colour (they lift while talking)
    const B = new Parts();
    for (const s of [-1, 1]) {
      const arc = 1.05;
      const g = new THREE.TorusGeometry(0.05, 0.0095, 5, 10, arc).rotateZ(Math.PI / 2 - arc / 2).translate(0, -0.05, 0).scale(1, 1, 0.6);
      B.add(onFace(g, s * (EYE_X + 0.004), BROW_Y, 0.004), browColor(hair));
    }
    this.brows = B.mesh(false);
    this.head.add(this.brows);

    // mouth: a smile when quiet; while talking an open "D" (with the tongue) that opens and closes
    const bearded = acc.includes("beard");
    const mouthGroup = new THREE.Group();
    placeOnFace(mouthGroup, 0, MOUTH_Y, bearded ? 0.02 : 0.003);
    const S = new Parts();
    S.add(new THREE.TorusGeometry(0.035, 0.0098, 6, 14, Math.PI).rotateZ(Math.PI).scale(1, 1, 0.6).translate(0, -0.006, 0), "#8a3b3b");
    this.smile = S.mesh(false);
    const O = new Parts();
    O.add(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).scale(1.1, 1, 1), "#5a1e22");
    O.add(new THREE.CylinderGeometry(0.026, 0.026, 0.012, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).scale(1.05, 0.55, 1).translate(0, -0.019, 0.001), "#d4686e");
    this.mouth = O.mesh(false);
    this.mouth.visible = false;
    mouthGroup.add(this.smile, this.mouth);
    this.head.add(mouthGroup);
  }

  /** Hair styles: the face (forehead, eyes, cheeks, mouth) always stays free. */
  private buildHair(P: Parts, look: Look, acc: string[]) {
    const s = look.hair.style, c = look.hair.color, R = HR;
    const H = (g: THREE.BufferGeometry) => P.add(g, c);
    const hatted = ["cap", "hat", "police", "pilot", "chef"].some((a) => acc.includes(a));
    if (s === "bald") {
      // a band round the back and the sides, at the ears
      H(new THREE.SphereGeometry(R * 1.035, 22, 3, Math.PI - 0.12, Math.PI + 0.24, Math.PI * 0.44, Math.PI * 0.17).scale(1, 1.02, 0.97));
    } else if (s === "buzz") {
      H(new THREE.SphereGeometry(HR * 1.04, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.02, 0.97).rotateX(-0.55).translate(0, 0.01, -0.004));
    } else if (s === "short" || s === "side") {
      H(hairCap(1.06, 0.6));
      // a tuft over the forehead (swept to one side for "side"), unless a hat covers it
      const side = s === "side";
      if (!hatted) H(new THREE.SphereGeometry(0.14, 14, 8).scale(1, 0.36, 0.62).rotateX(-0.42).rotateZ(side ? -0.32 : 0).translate(side ? 0.05 : 0, 0.205, 0.155));
      if (side && !hatted) H(new THREE.SphereGeometry(0.08, 10, 6).scale(1, 0.42, 0.62).rotateX(-0.55).rotateZ(-0.45).translate(0.125, 0.15, 0.175));
    } else if (s === "long" || s === "wavy") {
      const long = s === "long";
      H(hairCap(1.07, 0.52));
      // down the back, and a lock either side of the face
      const len = long ? 0.28 : 0.16;
      H(new THREE.CapsuleGeometry(R * 0.86, len, 6, 14).scale(1.12, 1, 0.48).translate(0, -0.06 - len / 2, -0.165));
      for (const sd of [-1, 1]) {
        const ll = long ? 0.3 : 0.2;
        H(new THREE.CapsuleGeometry(0.058, ll, 4, 10).rotateZ(sd * 0.07).translate(sd * 0.248, 0.02 - ll / 2 - 0.02, 0.035));
        if (!long) H(new THREE.SphereGeometry(0.068, 10, 7).translate(sd * 0.255, -0.25, 0.03));
      }
      if (!long) for (let i = 0; i < 4; i++) {
        const a = -1.0 + (i / 3) * 2.0;
        H(new THREE.SphereGeometry(0.075, 10, 7).translate(Math.sin(a) * 0.2, -0.4, -0.17 + Math.abs(Math.sin(a)) * 0.06));
      }
    } else if (s === "bob") {
      H(hairCap(1.07, 0.4));
      // straight sides and back to the chin, open at the face, the ends turned in a little
      const prof = [[0.262, -0.205], [0.3, -0.212], [0.322, -0.17], [0.31, -0.05], [0.294, 0.07]].map(([r, y]) => new THREE.Vector2(r, y));
      H(new THREE.LatheGeometry(prof, 24, 0.98, Math.PI * 2 - 1.96).scale(1, 1, 0.97).translate(0, 0, -0.012));
    } else if (s === "bun" || s === "ponytail") {
      H(hairCap(1.06, 0.62));
      if (s === "bun") H(new THREE.SphereGeometry(0.12, 14, 10).translate(0, 0.21, -0.2));
      else {
        H(new THREE.SphereGeometry(0.065, 10, 8).translate(0, 0.07, -0.28));
        H(new THREE.CapsuleGeometry(0.065, 0.26, 4, 10).rotateX(0.32).translate(0, -0.13, -0.33));
      }
    } else if (s === "curly") {
      H(hairCap(1.07, 0.5));
      // puffs over the top, the sides and the back (none on the face)
      for (const [th, n, r] of [[0.1, 4, 0.085], [0.27, 8, 0.085], [0.43, 11, 0.08], [0.58, 11, 0.072]] as [number, number, number][]) {
        for (let i = 0; i < n; i++) {
          const ph = (i / n) * Math.PI * 2 + th * 3;
          const st = Math.sin(th * Math.PI), x = Math.cos(ph) * st * R * 1.02, z = Math.sin(ph) * st * R * 0.98, y = Math.cos(th * Math.PI) * R * 1.02 + 0.02;
          if (z > 0.05 && y < 0.16) continue; // leave the face free
          if (y < -0.1 || (hatted && y > 0.08)) continue; // and nothing through a hat
          H(new THREE.SphereGeometry(r, 9, 7).translate(x, y, z - 0.01));
        }
      }
    }
    // facial hair
    const beard = acc.includes("beard");
    if (beard) {
      // from the ears down the jaw to the chin, under the mouth (its edge curves down from the sideburns)
      H(headShell(1.04, -0.25, Math.PI + 0.25, (ph) => Math.PI * (0.47 + 0.195 * Math.abs(Math.sin(ph)) ** 1.5), Math.PI * 0.94, 28, 8));
    }
    if (beard || acc.includes("mustache")) {
      const mc = c === "#e8e4dc" ? "#cfcac2" : c;
      for (const sd of [-1, 1]) {
        const g = new THREE.CapsuleGeometry(0.016, 0.04, 3, 8).rotateZ(Math.PI / 2 - sd * 0.38).scale(1, 1, 0.6);
        P.add(onFace(g, sd * 0.031, -0.068, 0.008), mc);
      }
    }
  }

  private buildHeadwear(P: Parts, look: Look, acc: string[]) {
    const R = HR, ac = look.accColor ?? "#2f7d6b";
    if (acc.includes("glasses") || acc.includes("sunglasses")) {
      const sun = acc.includes("sunglasses");
      const gm = sun ? "#1a1a1a" : "#3a3a3a", gz = 0.268;
      for (const s of [-1, 1]) {
        const x = s * EYE_X;
        // each lens turned a little with the face, so the frame wraps round it rather than sticking out
        const lens = (g: THREE.BufferGeometry) => g.rotateY(s * 0.3).translate(x, EYE_Y, gz - 0.006);
        P.add(lens(new THREE.TorusGeometry(0.055, 0.011, 6, 18)), gm);
        if (sun) P.add(lens(new THREE.CircleGeometry(0.052, 16).translate(0, 0, 0.001)), gm);
        // the arms back to the ears, round the side of the head
        const pts = [new THREE.Vector3(s * 0.146, EYE_Y + 0.008, gz - 0.022), new THREE.Vector3(s * 0.255, EYE_Y + 0.008, 0.12), new THREE.Vector3(s * 0.282, EYE_Y - 0.002, -0.03)];
        for (let i = 0; i < 2; i++) {
          const d = pts[i + 1].clone().sub(pts[i]), len = d.length();
          const g = new THREE.CylinderGeometry(0.0075, 0.0075, len, 4).translate(0, len / 2, 0);
          g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
          P.add(g.translate(pts[i].x, pts[i].y, pts[i].z), gm);
        }
      }
      P.add(new THREE.BoxGeometry(0.08, 0.012, 0.012).translate(0, EYE_Y + 0.012, gz + 0.004), gm);
    }
    if (acc.includes("shades") || acc.includes("readers")) {
      // pushed up on the head, resting on the hair (sunglasses: dark lenses)
      const sun = acc.includes("shades"), gm = sun ? "#1a1a1a" : "#5a4a3e", out = look.hair.style === "bald" ? 1.07 : 1.17;
      const up = (g: THREE.BufferGeometry) => { g.rotateX(-0.78); const a = g.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < a.count; i++) a.setXYZ(i, a.getX(i), a.getY(i) * out, a.getZ(i) * out); g.computeVertexNormals(); return g; };
      for (const s of [-1, 1]) {
        P.add(up(new THREE.TorusGeometry(0.055, 0.011, 6, 18).rotateY(s * 0.3).translate(s * EYE_X, EYE_Y, 0.262)), gm);
        if (sun) P.add(up(new THREE.CircleGeometry(0.052, 16).rotateY(s * 0.3).translate(s * EYE_X, EYE_Y, 0.263)), gm);
      }
      P.add(up(new THREE.BoxGeometry(0.08, 0.012, 0.012).translate(0, EYE_Y + 0.012, 0.266)), gm);
    }
    if (acc.includes("cap")) {
      P.add(new THREE.SphereGeometry(R * 1.09, 20, 8, 0, Math.PI * 2, 0, Math.PI * 0.42).translate(0, 0.045, -0.006), ac);
      P.add(new THREE.CylinderGeometry(0.16, 0.16, 0.022, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(0.12).translate(0, 0.128, 0.215), ac);
    }
    if (acc.includes("hat") || acc.includes("police") || acc.includes("pilot")) {
      const c = acc.includes("police") ? "#1d2940" : acc.includes("pilot") ? "#1d2f52" : ac;
      P.add(new THREE.CylinderGeometry(R * 0.96, R * 1.04, 0.15, 20).translate(0, 0.205, 0), c);
      P.add(new THREE.CylinderGeometry(R * 1.12, R * 0.96, 0.08, 20).translate(0, 0.31, 0), c);
      P.add(new THREE.CylinderGeometry(0.15, 0.15, 0.014, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(0.22).translate(0, 0.14, 0.2), "#111111");
      if (acc.includes("police") || acc.includes("pilot")) P.add(new THREE.CircleGeometry(0.035, 6).translate(0, 0.225, R * 1.0 + 0.002), "#e2c044");
    }
    if (acc.includes("chef")) {
      P.add(new THREE.CylinderGeometry(R * 0.92, R * 0.96, 0.2, 20).translate(0, 0.26, -0.01), "#ffffff");
      P.add(new THREE.SphereGeometry(R * 1.08, 20, 10).scale(1, 0.55, 1).translate(0, 0.39, -0.01), "#ffffff");
    }
    if (acc.includes("headset")) {
      const hc = "#2b2b2b";
      P.add(new THREE.TorusGeometry(R * 1.1, 0.014, 6, 22, Math.PI).translate(0, 0.02, -0.01), hc);
      for (const s of [-1, 1]) P.add(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12).rotateZ(Math.PI / 2).translate(s * R * 1.06, -0.01, -0.01), hc);
      P.add(new THREE.CapsuleGeometry(0.009, 0.15, 3, 6).rotateX(Math.PI / 2).rotateY(-0.75).translate(R * 0.82, -0.08, 0.13), hc);
      P.add(new THREE.SphereGeometry(0.016, 8, 6).translate(R * 0.5, -0.1, 0.22), hc);
    }
    if (acc.includes("earrings")) for (const s of [-1, 1]) P.add(new THREE.SphereGeometry(0.02, 8, 6).translate(s * R * 0.97, -0.085, 0.02), "#e2c044");
    if (acc.includes("flower")) for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      P.add(new THREE.SphereGeometry(0.026, 8, 6).translate(-0.19 + Math.cos(a) * 0.028, 0.16 + Math.sin(a) * 0.028, 0.15), "#e84a5f");
    }
  }

  // ------------------------------------------------------------------ animation

  setAnim(a: Anim) {
    if ((a === "sit") !== (this.anim === "sit")) this.fitLegs(a === "sit");
    this.anim = a;
  }

  /** Seated, the shins reach down to the floor: on seats built for people the characters' short legs would leave
   *  the feet hanging in the air. Standing, the usual shins come back. */
  private fitLegs(seated: boolean) {
    if (seated) {
      const { h, b } = this.legLook;
      const knee = this.seatY + 0.1 * b - 0.3 * h * Math.sin(SIT_DROOP);
      const extra = Math.max(0, knee - 0.01 - 0.3 * h - 0.05);
      if (!this.seatShins || Math.abs(extra - this.seatShinExtra) > 0.005) {
        for (const m of this.seatShins ?? []) { m.removeFromParent(); m.geometry.dispose(); }
        this.seatShins = [this.shinL, this.shinR].map((g) => { const m = this.shinMesh(extra); g.add(m); return m; });
        this.seatShinExtra = extra;
      }
    }
    for (const m of this.shins) m.visible = !seated;
    for (const m of this.seatShins ?? []) m.visible = seated;
  }

  update(dt: number) {
    this.t += dt;
    this.blob.visible = Character.blobShadows;
    const t = this.t, h = this.look.height ?? 1, b = this.look.build ?? 1;
    let legA = 0, kneeL = 0.03, kneeR = 0.03, armA = 0, bob = 0, lean = 0, headNod = 0, headTurn = 0;
    if (this.anim === "walk" || this.anim === "run") {
      const run = this.anim === "run";
      // steps at the pace of the real speed when it is known (4.4 m/s walking, 7.4 running)
      const pace = this.moveSpeed > 0 ? THREE.MathUtils.clamp(this.moveSpeed / (run ? 7.4 : 4.4), 0.55, 1.3) : 1;
      this.walkPhase += dt * (run ? 11 : 7.5) * pace;
      const ph = this.walkPhase;
      const amp = (run ? 0.75 : 0.55) * Math.min(1, 0.6 + pace * 0.4);
      legA = Math.sin(ph) * amp;
      // the knee folds while that foot swings forward
      kneeL = Math.max(0, -Math.cos(ph)) * (run ? 1.1 : 0.7) + 0.05;
      kneeR = Math.max(0, Math.cos(ph)) * (run ? 1.1 : 0.7) + 0.05;
      armA = -legA * 0.9;
      bob = Math.abs(Math.sin(ph)) * 0.05;
      lean = run ? 0.12 : 0.04;
    } else if (this.anim !== "sit") {
      bob = Math.sin(t * 2) * 0.008;
      headTurn = Math.sin(t * 0.5) * 0.08;
    }
    this.armL.rotation.set(0, 0, 0);
    this.armR.rotation.set(0, 0, 0);
    let browUp = 0, tilt = 0, mouthShape = 0;
    // with a recording to follow, the talking lasts exactly as long as it plays (it often starts a moment late)
    const lv = this.level?.() ?? null;
    if (lv !== null) this.talking = lv < 0 ? 0 : Math.max(this.talking, 0.1);
    if (this.talking > 0) {
      this.talking -= dt;
      // the mouth follows the recording's loudness (pauses between words and sentences close it); with no recording
      // to follow (the browser's own voice), syllables come from two rhythms mixed
      const target = lv ?? Math.max(0, Math.min(1, Math.sin(t * 13.5) * 0.55 + Math.sin(t * 7.1 + 1.3) * 0.4 + 0.3));
      // it opens fast and closes a little slower, like a real one; the brows follow the phrase, not each syllable
      this.mouthOpen += (target - this.mouthOpen) * Math.min(1, dt * (target > this.mouthOpen ? 28 : 16));
      this.browLift += (this.mouthOpen - this.browLift) * Math.min(1, dt * 4);
      headNod = Math.sin(t * 9) * 0.05 * (0.4 + 0.6 * this.mouthOpen);
      this.armR.rotation.z = -0.15 - Math.max(0, Math.sin(t * 3)) * 0.25;
      this.armR.rotation.x = -0.3 - Math.sin(t * 3) * 0.2;
      mouthShape = 0.15 + this.mouthOpen * 0.85;
      browUp = this.browLift * 0.014;
    } else {
      this.level = null;
      this.mouthOpen = this.browLift = 0;
    }
    // reacting to the learner's answer: two small nods (understood), or the head tilted and the brows up (not)
    if (this.reaction) {
      const r = this.reaction;
      r.t += dt;
      if (r.kind === "nod") {
        if (r.t < 0.8) headNod += Math.abs(Math.sin((r.t / 0.4) * Math.PI)) * 0.2;
        else this.reaction = null;
      } else if (r.t < 1.8) {
        const e = Math.sin(Math.min(1, r.t / 1.8) * Math.PI) ** 0.5;
        tilt = 0.2 * e;
        browUp = Math.max(browUp, 0.024 * e);
        if (this.talking <= 0) mouthShape = 0.3 * e;
      } else this.reaction = null;
    }
    this.brows.position.y = browUp;
    this.mouth.visible = mouthShape > 0.05;
    if (this.mouth.visible) this.mouth.scale.y = mouthShape;
    this.smile.visible = !this.mouth.visible;
    if (this.anim === "wave") {
      this.armR.rotation.z = -2.6 + Math.sin(t * 10) * 0.3;
      this.armR.rotation.x = 0;
    }
    if (this.anim === "sit") {
      // thighs along the seat, the shins (longer, see fitLegs) straight down to the floor, hands on the lap
      this.legL.rotation.x = this.legR.rotation.x = -Math.PI / 2 + SIT_DROOP;
      this.shinL.rotation.x = this.shinR.rotation.x = Math.PI / 2 - SIT_DROOP;
      this.body.position.set(0, this.seatY + 0.1 * b - 0.66 * h, 0.04);
      this.armL.rotation.set(-0.55, 0, 0.22);
      if (this.talking <= 0) this.armR.rotation.set(-0.55, 0, -0.22);
      if (this.skirt) this.skirt.scale.y = 0.5;
    } else {
      this.legL.rotation.x = legA;
      this.legR.rotation.x = -legA;
      this.shinL.rotation.x = kneeL;
      this.shinR.rotation.x = kneeR;
      this.armL.rotation.x = armA;
      if (this.talking <= 0 && this.anim !== "wave") this.armR.rotation.x = -armA;
      this.body.position.set(0, bob, 0);
      if (this.skirt) this.skirt.scale.y = 1;
    }
    this.body.rotation.x = lean;
    this.body.rotation.z = this.bank;
    this.head.rotation.x = headNod;
    this.head.rotation.y = headTurn;
    this.head.rotation.z = tilt;
    // blinking: shut and open again in 0.16 s, now and then twice
    this.blinkT -= dt;
    let open = 1;
    if (this.blinkT < 0.16) {
      const p = 1 - Math.max(0, this.blinkT) / 0.16;
      open = p < 0.35 ? 1 - p / 0.35 : p < 0.55 ? 0 : (p - 0.55) / 0.45;
    }
    this.eyes.scale.y = 0.1 + 0.9 * open;
    this.shine.visible = open > 0.6;
    if (this.blinkT < 0) this.blinkT = Math.random() < 0.15 ? 0.3 : 2.5 + Math.random() * 3.5;
  }

  /** Talk for `seconds`; `level` (optional) tells how loud the voice is right now, for the mouth (-1: it has ended). */
  talk(seconds: number, level?: () => number | null) {
    this.talking = Math.max(this.talking, seconds);
    this.level = level ?? null;
  }

  /** React to the learner's answer: a nod when understood, a puzzled look when not. */
  react(kind: "nod" | "puzzled") { this.reaction = { kind, t: 0 }; }

  /** Frees the GPU memory only this character uses: its geometries (built per character; NPCs are rebuilt
   *  on every zone change). The material is shared. */
  dispose() {
    this.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); });
  }
}
