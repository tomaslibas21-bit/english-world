// Character bodies for the trial world styles (see ../style.ts). Every character is one
// vertex-coloured mesh, rigidly skinned to a small skeleton (see StyledCharacter.ts), so it
// costs one draw call (two with the toon outline) instead of dozens.
//   toon      – big round head, big dark friendly eyes, short legs, mitten hands, round shoes
//   storybook – adult proportions, simple dot eyes, soft shapes, colours pulled into the palette
//   realistic – natural proportions (small head, long limbs), eyeballs, lips, belts, PBR values
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Look } from "../../content/npcs";
import { IS_TOON, IS_STORY, IS_REAL, grade } from "../style";

export const BONE = { root: 0, body: 1, head: 2, eyes: 3, mouth: 4, brows: 5, uArmL: 6, fArmL: 7, uArmR: 8, fArmR: 9, thighL: 10, shinL: 11, thighR: 12, shinR: 13, tail: 14 } as const;
export const BONE_COUNT = 15;

type PBR = [number, number]; // roughness, metalness (used by the realistic material)
const CLOTH: PBR = [0.9, 0], SKIN: PBR = [0.72, 0], HAIR: PBR = [0.48, 0.03], SHOE: PBR = [0.38, 0];
const EYE: PBR = [0.1, 0], LIPS: PBR = [0.42, 0], METAL: PBR = [0.28, 0.9], PLASTIC: PBR = [0.35, 0.05];

/** Collects part geometries (each fully bound to one bone) and merges them. */
class PartSet {
  private geos: THREE.BufferGeometry[] = [];
  add(g: THREE.BufferGeometry, color: THREE.Color, bone: number, pbr: PBR = CLOTH) {
    for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
    const n = g.attributes.position.count;
    if (!g.index) { const idx: number[] = []; for (let i = 0; i < n; i++) idx.push(i); g.setIndex(idx); }
    const col = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), pb = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      col[i * 3] = color.r; col[i * 3 + 1] = color.g; col[i * 3 + 2] = color.b;
      si[i * 4] = bone; sw[i * 4] = 1;
      pb[i * 2] = pbr[0]; pb[i * 2 + 1] = pbr[1];
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
    g.setAttribute("aPbr", new THREE.BufferAttribute(pb, 2));
    this.geos.push(g);
    return g;
  }
  build() { return mergeGeometries(this.geos, false)!; }
}

interface Prop {
  thigh: number; shin: number; shoe: number; legR: number; shinR: number; hipX: number;
  torso: number; neck: number; neckR: number; R: number; headS: [number, number, number]; headLift: number;
  shoulderX: number; upper: number; fore: number; armR: number; foreR: number; handR: number;
  profile: [number, number][]; zScale: number; eyeX: number; eyeUp: number; mouthDown: number; tilt: number;
}

const TOON: Prop = {
  thigh: 0.25, shin: 0.24, shoe: 0.09, legR: 0.1, shinR: 0.092, hipX: 0.105, torso: 0.36, neck: 0.09, neckR: 0.07,
  R: 0.27, headS: [1, 0.95, 0.94], headLift: 0.8, shoulderX: 0.27, upper: 0.19, fore: 0.17, armR: 0.07, foreR: 0.066, handR: 0.086,
  profile: [[0, -0.1], [0.15, -0.09], [0.2, -0.03], [0.215, 0.06], [0.205, 0.16], [0.212, 0.26], [0.2, 0.33], [0.145, 0.39], [0.07, 0.41], [0, 0.415]],
  zScale: 0.86, eyeX: 0.1, eyeUp: 0.0, mouthDown: 0.105, tilt: 0.5,
};
const STORY: Prop = {
  thigh: 0.36, shin: 0.35, shoe: 0.09, legR: 0.075, shinR: 0.062, hipX: 0.09, torso: 0.5, neck: 0.1, neckR: 0.05,
  R: 0.15, headS: [0.93, 1.08, 0.97], headLift: 0.85, shoulderX: 0.195, upper: 0.28, fore: 0.25, armR: 0.05, foreR: 0.044, handR: 0.052,
  profile: [[0, -0.1], [0.12, -0.09], [0.16, -0.03], [0.165, 0.06], [0.148, 0.18], [0.16, 0.3], [0.175, 0.4], [0.18, 0.46], [0.16, 0.5], [0.1, 0.535], [0.05, 0.548], [0, 0.55]],
  zScale: 0.72, eyeX: 0.052, eyeUp: 0.006, mouthDown: 0.062, tilt: 0.55,
};
const REAL: Prop = {
  thigh: 0.41, shin: 0.39, shoe: 0.08, legR: 0.086, shinR: 0.064, hipX: 0.095, torso: 0.54, neck: 0.07, neckR: 0.05,
  R: 0.116, headS: [0.92, 1.12, 1.02], headLift: 0.95, shoulderX: 0.2, upper: 0.28, fore: 0.25, armR: 0.05, foreR: 0.043, handR: 0.047,
  profile: [[0, -0.1], [0.12, -0.095], [0.16, -0.04], [0.165, 0.04], [0.148, 0.16], [0.152, 0.25], [0.176, 0.36], [0.195, 0.45], [0.2, 0.5], [0.17, 0.535], [0.1, 0.558], [0.06, 0.565], [0, 0.567]],
  zScale: 0.64, eyeX: 0.037, eyeUp: 0.013, mouthDown: 0.064, tilt: 0.62,
};

export interface CharSpec {
  geometry: THREE.BufferGeometry;
  height: number;
  sitDrop: number;
  joints: {
    hipX: number; hipY: number; thigh: number; shin: number; shoulderX: number; shoulderY: number; upper: number; neckTop: number;
    eyes: [number, number]; mouth: [number, number]; brows: [number, number]; tail: [number, number, number] | null;
  };
  motion: { bob: number; stride: number; armOut: number; squash: number; mouthIdle: number; mouthOpen: number; browLift: number };
  outline: { color: THREE.Color; thickness: number } | null;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: THREE.Color, b: string | THREE.Color, t: number) => a.clone().lerp(typeof b === "string" ? new THREE.Color(b) : b, t);

function lathe(pts: [number, number][], seg = 18, phiStart = 0, phiLength = Math.PI * 2) {
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), seg, phiStart, phiLength);
}
/** The part of a (radius, y) profile between y0 and y1, with interpolated end points. */
function section(prof: [number, number][], y0: number, y1: number): [number, number][] {
  const out: [number, number][] = [];
  const at = (y: number): number => {
    for (let i = 0; i < prof.length - 1; i++) {
      const [ra, ya] = prof[i], [rb, yb] = prof[i + 1];
      if (y >= ya && y <= yb) return ra + (rb - ra) * ((y - ya) / Math.max(1e-6, yb - ya));
    }
    return y < prof[0][1] ? prof[0][0] : prof[prof.length - 1][0];
  };
  if (y0 > prof[0][1]) out.push([at(y0), y0]);
  for (const p of prof) if (p[1] >= y0 && p[1] <= y1) out.push(p);
  if (y1 < prof[prof.length - 1][1]) out.push([at(y1), y1]);
  return out;
}
function radiusAt(prof: [number, number][], y: number) { const s = section(prof, y, y + 1e-4); return s.length ? s[0][0] : 0; }

/** Realistic skin: a little darker and warmer than the flat look colour (filmic light washes it out). */
function realSkin(hex: string) {
  const c = new THREE.Color(hex), hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h - 0.005, Math.min(1, hsl.s * 1.35 + 0.05), hsl.l * 0.8);
  return c;
}

const cache = new Map<string, CharSpec>();

/** Builds (or reuses) the body of a character with this look in the active style. */
export function buildCharacter(look: Look): CharSpec {
  const key = JSON.stringify(look);
  const hit = cache.get(key);
  if (hit) return hit;
  const spec = build(look);
  cache.set(key, spec);
  return spec;
}

function build(look: Look): CharSpec {
  const S = IS_TOON ? TOON : IS_STORY ? STORY : REAL;
  const h = look.height ?? 1, b = look.build ?? 1;
  const acc = look.acc ?? [];
  const P = new PartSet();
  // colours (realistic skin is a little darker and warmer than the flat look colour, see realSkin)
  const skin = IS_REAL ? realSkin(look.skin) : IS_TOON ? mix(new THREE.Color(look.skin), "#ffb08a", 0.05) : grade(look.skin);
  const top = grade(look.top), bottom = grade(look.bottom), shoes = grade(look.shoes ?? "#3a2f2a");
  const hair = grade(look.hair.color), accC = grade(look.accColor ?? "#2f7d6b");
  const skinDark = skin.clone().multiplyScalar(0.88);
  const dark = IS_STORY ? grade("#2b211d") : new THREE.Color("#221814");
  const white = IS_STORY ? grade("#fbf5ea") : new THREE.Color("#ffffff");
  const gold = grade("#e2c044");
  const bottomPbr: PBR = CLOTH;

  // ---- skeleton measurements
  const hipY = (S.thigh + S.shin) * h + S.shoe;
  const shoulderY = hipY + S.torso * h;
  const neckTop = shoulderY + S.neck * h;
  const R = S.R, [sx, sy, sz] = S.headS;
  const C = V(0, neckTop + R * sy * S.headLift, 0);
  const height = C.y + R * sy + R * 0.1;
  const prof: [number, number][] = S.profile.map(([r, y]) => [r * b, hipY + y * h]);
  const beltY = hipY + 0.05 * h;
  const faceZ = (x: number, dy: number) => R * sz * Math.sqrt(Math.max(0, 1 - (x / (R * sx)) ** 2 - (dy / (R * sy)) ** 2));

  // ---- torso (trousers below the belt, top above), skirt
  P.add(lathe(section(prof, -1, beltY)).scale(1, 1, S.zScale), bottom, BONE.body, bottomPbr);
  P.add(lathe(section(prof, beltY, 9)).scale(1, 1, S.zScale), top, BONE.body, CLOTH);
  const legC = look.skirt ? skin : bottom;
  if (look.skirt) {
    const hemY = hipY - S.thigh * h * (IS_TOON ? 0.95 : 0.7);
    const rb = radiusAt(prof, beltY);
    P.add(lathe([[rb * 1.55, hemY], [rb * 1.25, (hemY + beltY) / 2], [rb * 1.02, beltY + 0.01]]).scale(1, 1, S.zScale + 0.1), bottom, BONE.body, CLOTH);
  } else if (IS_REAL) {
    // belt
    const rb = radiusAt(prof, beltY);
    P.add(new THREE.TorusGeometry(rb + 0.004, 0.012, 4, 18).rotateX(Math.PI / 2).scale(1, 1, S.zScale).translate(0, beltY, 0), grade("#3a2a20"), BONE.body, SHOE);
  }
  // neck
  P.add(new THREE.CylinderGeometry(S.neckR * b * 0.9, S.neckR * b, (neckTop - shoulderY) + 0.08, 12).translate(0, (neckTop + shoulderY) / 2 + 0.01, 0), skin, BONE.body, SKIN);
  if (IS_REAL || IS_STORY) {
    // collar at the neckline
    const neckline = prof[prof.length - 1][1] - 0.014;
    P.add(new THREE.TorusGeometry(S.neckR * b * 1.3, S.neckR * 0.32, 5, 14).rotateX(Math.PI / 2).scale(1, 1, 0.9).translate(0, neckline, 0), top, BONE.body, CLOTH);
  }

  // ---- legs
  for (const side of [-1, 1]) {
    const x = side * S.hipX * b;
    const thighBone = side < 0 ? BONE.thighL : BONE.thighR, shinBone = side < 0 ? BONE.shinL : BONE.shinR;
    const kneeY = hipY - S.thigh * h, ankleY = kneeY - S.shin * h;
    P.add(new THREE.CapsuleGeometry(S.legR * b, S.thigh * h, 3, 9).translate(x, (hipY + kneeY) / 2, 0), legC, thighBone, look.skirt ? SKIN : bottomPbr);
    P.add(new THREE.CapsuleGeometry(S.shinR * b, S.shin * h - S.shinR * 0.5, 3, 9).translate(x, (kneeY + ankleY) / 2 + 0.01, 0), legC, shinBone, look.skirt ? SKIN : bottomPbr);
    if (IS_REAL) P.add(new THREE.SphereGeometry(S.legR * b * 0.86, 8, 5).translate(x, kneeY, 0), legC, shinBone, look.skirt ? SKIN : bottomPbr);
    // shoe
    const shoeR = IS_TOON ? 0.112 : IS_STORY ? 0.078 : 0.062;
    const sh = new THREE.SphereGeometry(shoeR, 10, 7).scale(IS_TOON ? 0.95 : 0.85, IS_TOON ? 0.62 : 0.56, IS_TOON ? 1.45 : 1.75);
    P.add(sh.translate(x, ankleY - S.shoe * 0.35, shoeR * (IS_TOON ? 0.45 : 0.55)), shoes, shinBone, SHOE);
    if (IS_REAL) P.add(new THREE.CylinderGeometry(0.052, 0.052, 0.016, 10).scale(0.95, 1, 1.9).translate(x, 0.008, shoeR * 0.55), grade("#2a2522"), shinBone, [0.8, 0]);
  }

  // ---- arms
  const cardigan = acc.includes("cardigan");
  const sleeve = cardigan ? accC : top;
  for (const side of [-1, 1]) {
    const x = side * S.shoulderX * b;
    const ub = side < 0 ? BONE.uArmL : BONE.uArmR, fb = side < 0 ? BONE.fArmL : BONE.fArmR;
    const elbowY = shoulderY - S.upper * h, wristY = elbowY - S.fore * h;
    if (!IS_TOON) P.add(new THREE.SphereGeometry(S.armR * b * 1.12, 8, 6).scale(1, 0.9, 1).translate(x - side * S.armR * b * 0.2, shoulderY - S.armR * 0.15, 0), sleeve, ub, CLOTH);
    P.add(new THREE.CapsuleGeometry(S.armR * b, S.upper * h, 3, 8).translate(x, (shoulderY + elbowY) / 2, 0), sleeve, ub, CLOTH);
    P.add(new THREE.CapsuleGeometry(S.foreR * b, S.fore * h, 3, 8).translate(x, (elbowY + wristY) / 2, 0), sleeve, fb, CLOTH);
    // hand: a mitten with a thumb
    const hr = S.handR;
    P.add(new THREE.SphereGeometry(hr, 9, 7).scale(IS_TOON ? 1 : 0.72, IS_TOON ? 1 : 1.25, IS_TOON ? 1 : 0.95).translate(x, wristY - hr * 0.9, 0), skin, fb, SKIN);
    P.add(new THREE.SphereGeometry(hr * 0.42, 6, 4).translate(x - side * hr * 0.25, wristY - hr * 0.55, hr * 0.62), skin, fb, SKIN);
  }

  // ---- head
  const HB = BONE.head;
  P.add(new THREE.SphereGeometry(R, 20, 15).scale(sx, sy, sz).translate(C.x, C.y, C.z), skin, HB, SKIN);
  if (IS_REAL) {
    // jaw and chin
    P.add(new THREE.SphereGeometry(R * 0.74, 14, 10).scale(0.86, 0.82, 0.92).translate(0, C.y - R * 0.5, R * 0.14), skin, HB, SKIN);
  }
  // ears
  const earR = IS_TOON ? 0.056 : IS_STORY ? 0.032 : 0.022;
  for (const s of [-1, 1]) P.add(new THREE.SphereGeometry(earR, 8, 5).scale(0.5, 0.9, 0.7).translate(s * R * sx * 0.97, C.y - R * 0.08, -R * 0.02), skin, HB, SKIN);
  // nose
  if (IS_REAL) {
    const nz = faceZ(0, -R * 0.12);
    P.add(new THREE.SphereGeometry(0.014, 8, 5).scale(0.8, 1.35, 1).translate(0, C.y - R * 0.1, nz + 0.002), skin, HB, SKIN);
    P.add(new THREE.SphereGeometry(0.0125, 8, 5).translate(0, C.y - R * 0.26, nz + 0.008), skinDark, HB, SKIN);
  } else {
    const nr = IS_TOON ? 0.03 : 0.016;
    P.add(new THREE.SphereGeometry(nr, 10, 6).scale(1, 0.85, 1).translate(0, C.y - R * 0.14, faceZ(0, -R * 0.14) + nr * 0.1), skinDark, HB, SKIN);
  }
  // cheeks
  if (!IS_REAL) {
    const blush = mix(skin, IS_TOON ? "#ff6f6f" : "#e0806a", IS_TOON ? 0.38 : 0.28);
    for (const s of [-1, 1]) {
      const bx = s * R * (IS_TOON ? 0.58 : 0.56), by = -R * (IS_TOON ? 0.2 : 0.24);
      const br = IS_TOON ? 0.045 : 0.022;
      P.add(new THREE.SphereGeometry(br, 10, 6).scale(1, 0.62, 0.3).rotateY(s * 0.55).translate(bx, C.y + by, faceZ(bx, by) - br * 0.12), blush, HB, SKIN);
    }
  }
  // eyes (one bone: blinking squashes them vertically)
  const eyeY = C.y + S.eyeUp;
  const eyeZ = faceZ(S.eyeX, S.eyeUp);
  for (const s of [-1, 1]) {
    const ex = s * S.eyeX;
    const ry = Math.atan2(ex, eyeZ) * 0.8;
    if (IS_TOON) {
      P.add(new THREE.SphereGeometry(1, 12, 9).scale(0.046, 0.064, 0.022).rotateY(ry).translate(ex, eyeY, eyeZ - 0.004), dark, BONE.eyes, EYE);
      P.add(new THREE.SphereGeometry(0.016, 8, 6).translate(ex + 0.015, eyeY + 0.024, eyeZ + 0.016), white, BONE.eyes, EYE);
      P.add(new THREE.SphereGeometry(0.008, 6, 4).translate(ex - 0.013, eyeY - 0.02, eyeZ + 0.017), white, BONE.eyes, EYE);
    } else if (IS_STORY) {
      P.add(new THREE.SphereGeometry(1, 10, 8).scale(0.019, 0.025, 0.01).rotateY(ry).translate(ex, eyeY, eyeZ - 0.001), dark, BONE.eyes, EYE);
      P.add(new THREE.SphereGeometry(0.0055, 8, 6).translate(ex + 0.007, eyeY + 0.009, eyeZ + 0.008), white, BONE.eyes, EYE);
    } else {
      const ball = 0.0175;
      const iris = /#[a-d]/.test(look.hair.color) || look.hair.color === "#e8e4dc" ? new THREE.Color("#4f7896") : new THREE.Color("#4a2f1f");
      const ez = eyeZ - ball * 0.55;
      P.add(new THREE.SphereGeometry(ball, 9, 7).translate(ex, eyeY, ez), new THREE.Color("#f4f1ec"), BONE.eyes, EYE);
      P.add(new THREE.SphereGeometry(0.0098, 8, 5).scale(1, 1, 0.45).translate(ex, eyeY, ez + ball * 0.93), iris, BONE.eyes, EYE);
      P.add(new THREE.SphereGeometry(0.0048, 6, 4).scale(1, 1, 0.5).translate(ex, eyeY, ez + ball * 1.02), new THREE.Color("#0c0a09"), BONE.eyes, EYE);
      // upper lid crease (skin), so the eye sits in the face rather than on it
      P.add(new THREE.SphereGeometry(ball * 1.12, 9, 4, 0, Math.PI * 2, 0, Math.PI * 0.42).rotateX(0.35).translate(ex, eyeY + 0.001, ez), skinDark, HB, SKIN);
    }
  }
  // brows
  const browY = eyeY + (IS_TOON ? 0.092 : IS_STORY ? 0.042 : 0.03);
  const browZ = faceZ(S.eyeX, browY - C.y);
  const browC = hair.clone().multiplyScalar(0.75);
  for (const s of [-1, 1]) {
    const br = IS_TOON ? 0.013 : IS_STORY ? 0.0065 : 0.0048, bl = IS_TOON ? 0.06 : IS_STORY ? 0.034 : 0.03;
    P.add(new THREE.CapsuleGeometry(br, bl, 3, 6).rotateZ(Math.PI / 2 + s * 0.12).scale(1, 1, 0.6).translate(s * S.eyeX, browY, browZ + br * 0.3), browC, BONE.brows, HAIR);
  }
  // mouth (one bone: talking opens it)
  const bearded = acc.includes("beard");
  const mouthY = C.y - S.mouthDown;
  const mouthZ = faceZ(0, -S.mouthDown) + (bearded ? R * 0.06 : 0);
  if (IS_REAL) {
    // upper lip on the head; the dark opening and the lower lip on the mouth bone (squashed shut when quiet)
    const lip = mix(skin, "#b55a5a", 0.4);
    P.add(new THREE.CapsuleGeometry(0.0068, 0.03, 3, 8).rotateZ(Math.PI / 2).scale(1, 1, 0.7).translate(0, mouthY + 0.004, mouthZ + 0.001), lip, HB, LIPS);
    P.add(new THREE.SphereGeometry(0.014, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.25, 1, 0.35).translate(0, mouthY, mouthZ), new THREE.Color("#3a1616"), BONE.mouth, LIPS);
    P.add(new THREE.CapsuleGeometry(0.0074, 0.026, 3, 8).rotateZ(Math.PI / 2).scale(1, 1, 0.7).translate(0, mouthY - 0.0145, mouthZ + 0.0015), lip, BONE.mouth, LIPS);
  } else {
    const mr = IS_TOON ? 0.052 : 0.026;
    // lower half of a sphere: a smiling "D", squashed to a line when closed
    P.add(new THREE.SphereGeometry(mr, 14, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.05, 1, 0.45).translate(0, mouthY, mouthZ - mr * 0.12),
      IS_TOON ? new THREE.Color("#7a2a33") : grade("#8a3b3b"), BONE.mouth, LIPS);
  }

  // ---- hair
  let tail: [number, number, number] | null = null;
  const hs = look.hair.style;
  const hk = IS_TOON ? 1.1 : IS_REAL ? 1.09 : 1.08;
  const hsph = (k: number, t0: number, tl: number, p0 = 0, pl = Math.PI * 2, seg = 20) =>
    new THREE.SphereGeometry(R * k, seg, 10, p0, pl, t0, tl);
  const place = (g: THREE.BufferGeometry, tilt = 0, dy = 0, dz = 0) => g.rotateX(-tilt).scale(sx, sy, sz).translate(C.x, C.y + dy, C.z + dz);
  const H = (g: THREE.BufferGeometry, bone: number = HB) => P.add(g, hair, bone, HAIR);
  if (hs === "bald") {
    H(place(hsph(1.04, Math.PI * 0.44, Math.PI * 0.2, Math.PI * 0.8, Math.PI * 1.4)));
  } else {
    // cap over the top, tilted back so the forehead stays clear
    H(place(hsph(hs === "buzz" ? 1.03 : hk, 0, Math.PI / 2), S.tilt, R * 0.02, -R * 0.03));
    // back of the head (short styles leave the ears free)
    const longish = hs === "long" || hs === "wavy" || hs === "bob" || hs === "bun" || hs === "ponytail" || hs === "curly";
    if (hs !== "buzz") H(place(longish ? hsph(hk - 0.02, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.85, Math.PI * 1.3) : hsph(hk - 0.02, Math.PI * 0.25, Math.PI * 0.45, Math.PI * 1.08, Math.PI * 0.84), 0, 0, -R * 0.02));
  }
  if (hs === "short" || hs === "side" || hs === "curly" && IS_REAL) {
    const off = hs === "side" ? R * 0.22 : 0;
    const g = new THREE.SphereGeometry(R * 0.62, 12, 8).scale(1, 0.34, 0.5).rotateX(-0.45).rotateZ(hs === "side" ? -0.35 : 0);
    H(g.scale(sx, sy, sz).translate(off, C.y + R * 0.62, R * 0.52));
  }
  if (hs === "long" || hs === "wavy") {
    const len = hs === "long" ? R * 1.5 : R * 1.0;
    H(new THREE.CapsuleGeometry(R * 0.7, len, 4, 12).scale(1.28 * sx, 1, 0.55).translate(0, C.y - R * 0.35 - len / 2, -R * 0.42));
    for (const s of [-1, 1]) H(new THREE.CapsuleGeometry(R * 0.2, len * 0.9, 3, 8).translate(s * R * 0.9 * sx, C.y - R * 0.25 - len * 0.4, -R * 0.05));
    if (hs === "wavy") for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.45;
      H(new THREE.SphereGeometry(R * 0.26, 8, 6).translate(Math.sin(a) * R * 0.95 * sx, C.y - R * 0.35 - len, -Math.cos(a) * R * 0.45));
    }
  }
  if (hs === "bob") {
    const g = lathe([[R * 1.0, -R * 0.78], [R * 1.12, -R * 0.62], [R * 1.12, 0], [R * 1.06, R * 0.35]], 18, 0.95, Math.PI * 2 - 1.9);
    H(g.scale(sx, sy, sz).translate(C.x, C.y, C.z - R * 0.02));
  }
  if (hs === "bun") H(new THREE.SphereGeometry(R * 0.42, 12, 9).translate(0, C.y + R * 0.62, -R * 0.78));
  if (hs === "ponytail") {
    H(new THREE.SphereGeometry(R * 0.2, 8, 6).translate(0, C.y + R * 0.18, -R * 1.02 * sz));
    tail = [0, C.y + R * 0.15, -R * 1.05 * sz];
    const tl = R * (IS_TOON ? 1.3 : 1.6);
    H(new THREE.CapsuleGeometry(R * 0.24, tl, 3, 8).scale(1, 1, 0.8).translate(0, -tl / 2 - R * 0.1, -R * 0.12).translate(tail[0], tail[1], tail[2]), BONE.tail);
  }
  if (hs === "curly" && !IS_REAL) {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const ring = i % 2;
      const y = ring ? R * 0.45 : R * 0.05;
      const rr = ring ? R * 0.78 : R * 0.98;
      if (Math.sin(a) > 0.55 && !ring) continue; // leave the face free
      H(new THREE.SphereGeometry(R * 0.3, 8, 6).translate(Math.cos(a) * rr * sx, C.y + y, Math.sin(a) * rr * sz - R * 0.08));
    }
  }
  if (hs === "curly" && IS_REAL) for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2, y = (i % 3) * R * 0.3 - R * 0.05;
    if (Math.sin(a) > 0.5 && y < R * 0.3) continue;
    H(new THREE.SphereGeometry(R * 0.24, 7, 5).translate(Math.cos(a) * R * 0.96 * sx, C.y + y, Math.sin(a) * R * 0.92 * sz - R * 0.05));
  }

  // ---- accessories
  const chestY = hipY + S.torso * h * 0.72;
  const frontZ = (y: number) => radiusAt(prof, y) * S.zScale;
  if (acc.includes("glasses") || acc.includes("sunglasses")) {
    const sun = acc.includes("sunglasses");
    const gm = sun ? grade("#15151a") : grade("#2e2e36");
    const rr = IS_TOON ? 0.068 : IS_STORY ? 0.028 : 0.022, tube = IS_TOON ? 0.011 : IS_STORY ? 0.0045 : 0.0028;
    const gz = eyeZ + (IS_TOON ? 0.03 : IS_STORY ? 0.012 : 0.01);
    for (const s of [-1, 1]) {
      P.add(new THREE.TorusGeometry(rr, tube, 4, 16).translate(s * S.eyeX, eyeY, gz), gm, HB, METAL);
      if (sun) P.add(new THREE.CircleGeometry(rr, 18).translate(s * S.eyeX, eyeY, gz + 0.001), gm, HB, PLASTIC);
      // temple back to the ear
      P.add(new THREE.CapsuleGeometry(tube, R * 0.9, 2, 4).rotateX(Math.PI / 2).translate(s * (S.eyeX + rr) * 1.05, eyeY + rr * 0.3, gz - R * 0.45), gm, HB, METAL);
    }
    P.add(new THREE.CapsuleGeometry(tube, S.eyeX * 2 - rr * 2, 2, 4).rotateZ(Math.PI / 2).translate(0, eyeY + rr * 0.3, gz), gm, HB, METAL);
  }
  if (bearded) {
    const g = new THREE.SphereGeometry(R * 1.03, 24, 12, 0, Math.PI, Math.PI * 0.56, Math.PI * 0.36);
    P.add(g.scale(sx, sy, sz).translate(C.x, C.y, C.z + R * 0.02), hair, HB, HAIR);
  }
  if (acc.includes("mustache")) {
    const mc = look.hair.color === "#e8e4dc" ? grade("#cfcac2") : hair;
    for (const s of [-1, 1]) {
      const mr = IS_TOON ? 0.022 : IS_STORY ? 0.011 : 0.0075, ml = IS_TOON ? 0.07 : IS_STORY ? 0.036 : 0.026;
      P.add(new THREE.CapsuleGeometry(mr, ml, 3, 6).rotateZ(Math.PI / 2 - s * 0.35).translate(s * ml * 0.42, mouthY + S.mouthDown * 0.42, mouthZ + mr * 0.6), mc, HB, HAIR);
    }
  }
  const hatBand = (color: THREE.Color, crownH: number, topW: number, brimC: THREE.Color) => {
    const cy = C.y + R * sy * 0.55;
    P.add(new THREE.CylinderGeometry(R * 1.02 * topW, R * 1.05, crownH, 22).scale(sx, 1, sz).translate(0, cy + crownH / 2, -R * 0.04), color, HB, CLOTH);
    P.add(new THREE.CylinderGeometry(R * 1.12 * topW, R * 1.02 * topW, crownH * 0.35, 22).scale(sx, 1, sz).translate(0, cy + crownH * 1.1, -R * 0.08), color, HB, CLOTH);
    P.add(new THREE.CylinderGeometry(R * 0.62, R * 0.62, R * 0.07, 18, 1, false, -Math.PI / 2, Math.PI).scale(1.2, 1, 1).rotateX(0.12).translate(0, cy + R * 0.02, R * 0.72 * sz), brimC, HB, PLASTIC);
    return cy;
  };
  if (acc.includes("cap")) {
    P.add(place(hsph(hk + 0.05, 0, Math.PI / 2), 0.28, R * 0.04, -R * 0.02), accC, HB, CLOTH);
    P.add(new THREE.CylinderGeometry(R * 0.66, R * 0.66, R * 0.06, 18, 1, false, -Math.PI / 2, Math.PI).scale(1.15, 1, 1.1).rotateX(0.1).translate(0, C.y + R * 0.36, R * 0.75 * sz), accC, HB, CLOTH);
  }
  if (acc.includes("police") || acc.includes("hat") || acc.includes("pilot")) {
    const c = acc.includes("police") ? grade("#1d2940") : acc.includes("pilot") ? grade("#1d2f52") : accC;
    const cy = hatBand(c, R * 0.42, 1.08, grade("#111418"));
    if (acc.includes("police") || acc.includes("pilot")) P.add(new THREE.SphereGeometry(R * 0.12, 8, 6).scale(1, 1, 0.3).translate(0, cy + R * 0.25, R * 1.02 * sz), gold, HB, METAL);
  }
  if (acc.includes("chef")) {
    P.add(new THREE.CylinderGeometry(R * 0.95, R * 0.9, R * 0.8, 20).translate(0, C.y + R * sy * 0.9, -R * 0.05), white, HB, CLOTH);
    P.add(new THREE.SphereGeometry(R * 1.08, 20, 12).scale(1, 0.6, 1).translate(0, C.y + R * sy * 1.35, -R * 0.05), white, HB, CLOTH);
  }
  if (acc.includes("headset")) {
    const hc = grade("#2b2b30");
    P.add(new THREE.TorusGeometry(R * 1.1, R * 0.04, 6, 24, Math.PI).scale(sx, sy, 1).translate(0, C.y + R * 0.02, -R * 0.02), hc, HB, PLASTIC);
    for (const s of [-1, 1]) P.add(new THREE.SphereGeometry(R * 0.2, 8, 6).scale(0.6, 1, 1).translate(s * R * 1.02 * sx, C.y - R * 0.08, 0), hc, HB, PLASTIC);
    P.add(new THREE.CapsuleGeometry(R * 0.03, R * 0.7, 3, 6).rotateX(Math.PI / 2).rotateY(-0.5).translate(R * 0.75 * sx, C.y - R * 0.38, R * 0.45), hc, HB, PLASTIC);
  }
  if (acc.includes("earrings")) for (const s of [-1, 1]) P.add(new THREE.SphereGeometry(IS_TOON ? 0.02 : 0.009, 8, 6).translate(s * R * 0.98 * sx, C.y - R * 0.38, 0), gold, HB, METAL);
  if (acc.includes("flower")) for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    P.add(new THREE.SphereGeometry(R * 0.09, 8, 6).translate(-R * 0.72 + Math.cos(a) * R * 0.1, C.y + R * 0.52 + Math.sin(a) * R * 0.1, R * 0.4), grade("#e84a5f"), HB, CLOTH);
  }
  // body accessories
  if (acc.includes("apron")) {
    const y0 = hipY - S.thigh * h * 0.55, y1 = hipY + S.torso * h * 0.78;
    const apProf: [number, number][] = [[radiusAt(prof, hipY) * 1.12, y0], ...section(prof, hipY, y1).map(([r, y]) => [r * 1.045, y] as [number, number])];
    P.add(lathe(apProf, 16, -0.95, 1.9).scale(1, 1, S.zScale * 1.03), accC, BONE.body, CLOTH);
  }
  if (acc.includes("vest") || cardigan) {
    const y0 = beltY - 0.02, y1 = hipY + S.torso * h * 0.93;
    const vProf = section(prof, y0, y1).map(([r, y]) => [r * 1.04, y] as [number, number]);
    P.add(lathe(vProf, 20, 0.42, Math.PI * 2 - 0.84).scale(1, 1, S.zScale * 1.02), cardigan ? accC : grade(look.accColor ?? "#6d8f3e"), BONE.body, CLOTH);
  }
  if (acc.includes("tie") || acc.includes("bowtie")) {
    const ty = hipY + S.torso * h * 0.93;
    const tz = frontZ(ty - 0.02) + 0.004;
    if (acc.includes("bowtie")) {
      for (const s of [-1, 1]) P.add(new THREE.ConeGeometry(R * (IS_TOON ? 0.22 : 0.3), R * (IS_TOON ? 0.32 : 0.45), 8).rotateZ(s * Math.PI / 2).translate(s * R * 0.16, ty, tz + 0.01), accC, BONE.body, CLOTH);
    } else {
      const len = S.torso * h * 0.62, tieR = IS_TOON ? 0.026 : 0.016;
      P.add(new THREE.SphereGeometry(tieR * 1.1, 8, 6).translate(0, ty - 0.01, tz + 0.006), accC, BONE.body, CLOTH);
      P.add(new THREE.CapsuleGeometry(tieR, len, 3, 6).scale(1, 1, 0.35).translate(0, ty - 0.02 - len / 2, frontZ(ty - len * 0.6) + 0.008), accC, BONE.body, CLOTH);
    }
  }
  if (acc.includes("scarf")) {
    P.add(new THREE.TorusGeometry(S.neckR * b * 1.55, S.neckR * 0.7, 6, 14).rotateX(Math.PI / 2).translate(0, shoulderY + 0.05 * h, 0), accC, BONE.body, CLOTH);
    P.add(new THREE.CapsuleGeometry(S.neckR * 0.55, S.torso * h * 0.35, 3, 8).scale(1, 1, 0.4).translate(S.neckR * 0.9, shoulderY - S.torso * h * 0.15, frontZ(shoulderY - 0.08) + 0.01), accC, BONE.body, CLOTH);
  }
  if (acc.includes("badge") || acc.includes("police")) {
    const by = chestY, bx = S.shoulderX * b * 0.42;
    P.add(new THREE.BoxGeometry(IS_TOON ? 0.07 : 0.045, IS_TOON ? 0.05 : 0.032, 0.008).translate(bx, by, frontZ(by) + 0.004), acc.includes("police") ? gold : white, BONE.body, PLASTIC);
  }
  if (acc.includes("lanyard")) {
    const cy = hipY + S.torso * h * 0.5;
    P.add(new THREE.TorusGeometry(S.neckR * 2.1, 0.004, 4, 16, Math.PI).rotateZ(Math.PI).scale(0.7, 1.6, 1).translate(0, shoulderY + 0.02 - S.neckR * 1.8, frontZ(shoulderY - 0.05) + 0.006), grade("#2c5d8a"), BONE.body, CLOTH);
    P.add(new THREE.BoxGeometry(0.05, 0.065, 0.006).translate(0, cy, frontZ(cy) + 0.006), white, BONE.body, PLASTIC);
  }

  // ---- result
  const geometry = P.build();
  const sitDrop = Math.max(0, hipY - (0.5 + S.legR * b));
  return {
    geometry, height, sitDrop,
    joints: {
      hipX: S.hipX * b, hipY, thigh: S.thigh * h, shin: S.shin * h, shoulderX: S.shoulderX * b, shoulderY, upper: S.upper * h, neckTop,
      eyes: [eyeY, eyeZ], mouth: [mouthY, mouthZ], brows: [browY, browZ], tail,
    },
    motion: IS_TOON
      ? { bob: 0.075, stride: 1.05, armOut: 0.16, squash: 0.045, mouthIdle: 0.32, mouthOpen: 0.85, browLift: 0.016 }
      : IS_STORY
        ? { bob: 0.045, stride: 0.95, armOut: 0.09, squash: 0, mouthIdle: 0.3, mouthOpen: 0.9, browLift: 0.008 }
        : { bob: 0.035, stride: 0.9, armOut: 0.1, squash: 0, mouthIdle: 0.22, mouthOpen: 0.8, browLift: 0.005 },
    outline: IS_TOON ? { color: new THREE.Color("#2a1d26"), thickness: 0.016 } : null,
  };
}
