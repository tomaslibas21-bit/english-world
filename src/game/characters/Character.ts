// Procedural cartoon characters built from a Look (see content/npcs.ts), with simple
// walk / idle / talk / wave / sit animations, and little things they do while they wait. No external assets.
// Each moving part (body, head, upper arms, forearms, thighs, shins, eyes, irises, brows, mouth) is built from simple
// vertex-coloured shapes, and then all of them are baked into one skinned mesh, each part following its own bone: a
// character is one draw call (and one in the shadow pass), so the town can hold many people.
//
// Characters, second version (13 Nov 2026; shared by every edition's town):
// - the face: eye whites, a coloured iris and a pupil that look where the person looks, an upper lash line, lids that
//   shut for a blink, a brow each (they lift and tilt), a closed mouth whose corners rise or drop, an open one with
//   teeth and a tongue that takes its width and its height from the voice (see talk); four expressions (express);
// - the body: a shaped torso (shoulders, waist, hips), forearms on elbows, hands with a thumb, rounded shoes; a posture
//   of their own (age from grey hair or laugh lines, and a temperament drawn from the look);
// - idle motion: breathing and weight shifts at each person's own pace, eyes and head turning to the learner (watch),
//   gestures by the phrase while talking, more to do while sitting.
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


/** The detail the shapes below are built with: 1, as always; less for a person's far version (Character.far: graphics
 *  round 5, theme.ts `farPeople`), its round shapes with fewer sides. At 1 the shapes are made exactly as before. */
let Q = 1;
/** `n` segments (three.js's default `def` when not given) times Q, at least `min` (or `n` itself, if fewer). */
const seg = (n: number | undefined, def: number, min: number) => { const v = n ?? def; return Math.max(Math.min(v, min), Math.round(v * Q)); };
type A<T extends abstract new (...a: any) => any> = ConstructorParameters<T>;
const G = {
  sphere: (...a: A<typeof THREE.SphereGeometry>) => { if (Q !== 1) { a[1] = seg(a[1], 32, 4); a[2] = seg(a[2], 16, 3); } return new THREE.SphereGeometry(...a); },
  capsule: (...a: A<typeof THREE.CapsuleGeometry>) => { if (Q !== 1) { a[2] = seg(a[2], 4, 1); a[3] = seg(a[3], 8, 4); } return new THREE.CapsuleGeometry(...a); },
  cylinder: (...a: A<typeof THREE.CylinderGeometry>) => { if (Q !== 1) a[3] = seg(a[3], 32, 4); return new THREE.CylinderGeometry(...a); },
  cone: (...a: A<typeof THREE.ConeGeometry>) => { if (Q !== 1) a[2] = seg(a[2], 32, 4); return new THREE.ConeGeometry(...a); },
  circle: (...a: A<typeof THREE.CircleGeometry>) => { if (Q !== 1) a[1] = seg(a[1], 32, 4); return new THREE.CircleGeometry(...a); },
  torus: (...a: A<typeof THREE.TorusGeometry>) => { if (Q !== 1) { a[2] = seg(a[2], 12, 3); a[3] = seg(a[3], 48, 4); } return new THREE.TorusGeometry(...a); },
  lathe: (...a: A<typeof THREE.LatheGeometry>) => { if (Q !== 1) a[1] = seg(a[1], 12, 5); return new THREE.LatheGeometry(...a); },
};

/** A number in 0…1 drawn from a look and a salt: the same person gets the same every time they are built (their
 *  temperament, their eye colour), whatever Math.random does. */
function trait(look: Look, salt: number) {
  const s = `${look.skin}${look.hair.color}${look.hair.style}${look.top}${look.bottom}${look.height ?? 1}${look.build ?? 1}`;
  let x = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
  x ^= x >>> 15; x = Math.imul(x, 2246822507); x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
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

/** The iris: brown for most; blue, green or hazel now and then with fair skin, more often under fair hair (the same
 *  for the same look every time). */
function irisColor(look: Look) {
  const sk = { h: 0, s: 0, l: 0 }, hr = { h: 0, s: 0, l: 0 };
  new THREE.Color(look.skin).getHSL(sk);
  new THREE.Color(look.hair.color).getHSL(hr);
  const r = trait(look, 7), fair = sk.l > 0.74, fairHair = hr.l > 0.3 && hr.s > 0.22;
  if (fair && fairHair) return r < 0.42 ? "#2f5f8a" : r < 0.66 ? "#3f6a45" : r < 0.84 ? "#6b5232" : "#3d2518";
  if (fair) return r < 0.16 ? "#2f5f8a" : r < 0.28 ? "#3f6a45" : r < 0.48 ? "#6b5232" : "#3d2518";
  return r < 0.8 ? "#341f15" : "#4a2e1c";
}

/** The embroidery's flowers (a hipil's, a blusa bordada's). */
const FLOWERS = ["#d62839", "#e4007c", "#f6a800", "#1f6fd1", "#d62839", "#ff8fab"];

// ---- the face: the head is a ball (radius HR, a little taller than deep), and the features are laid onto it
const HR = 0.27;
const HA = HR, HB = HR * 1.02, HC = HR * 0.96;
const EYE_X = 0.095, EYE_Y = 0.03, BROW_Y = 0.112, MOUTH_Y = -0.098;
/** Half the closed mouth's width. */
const MOUTH_W = 0.036;
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
  return G.sphere(HR * k, 24, 12, 0, Math.PI * 2, 0, len).scale(1, 1.02, 0.97).rotateX(-tilt).translate(0, 0.012, -0.012);
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

/** What a face shows: the conversation picks one for each line (mood.ts moodOf), and the person's own between lines. */
export type Mood = "friendly" | "neutral" | "surprised" | "concerned";
/** Each expression: the brows' lift (m) and tilt (radians, + the inner ends up), how open the eyes are, how far the
 *  closed mouth's corners rise (m; below 0 they drop), and a small round mouth (0–1). */
const FACES: Record<Mood, { brow: number; tilt: number; eye: number; smile: number; oh: number }> = {
  friendly: { brow: 0.004, tilt: 0, eye: 0.95, smile: 0.02, oh: 0 },
  neutral: { brow: 0, tilt: 0, eye: 1, smile: 0.005, oh: 0 },
  surprised: { brow: 0.021, tilt: 0.06, eye: 1.13, smile: 0, oh: 1 },
  concerned: { brow: 0.007, tilt: 0.3, eye: 0.97, smile: -0.011, oh: 0 },
};

/** What the hands do while someone talks, a phrase at a time: an open palm, both hands, a hand to the chest, a small
 *  explaining circle, a shrug; or nothing. */
type Gesture = "palm" | "both" | "chest" | "explain" | "shrug" | "rest";
/** Each gesture's arm (the upper arm forward (−) and out (+), the elbow's bend (−), the forearm's twist and its turn
 *  outwards (+) or in across the body (−)), and whether both arms take it. */
const GESTURES: Record<Gesture, { ux: number; out: number; fx: number; fy: number; fz: number; both?: boolean }> = {
  rest: { ux: 0, out: 0, fx: 0, fy: 0, fz: 0 },
  palm: { ux: -0.38, out: 0.16, fx: -1.2, fy: -0.9, fz: 0.15 },
  both: { ux: -0.3, out: 0.2, fx: -1.05, fy: -0.9, fz: 0.3, both: true },
  chest: { ux: -0.35, out: -0.1, fx: -2.2, fy: 0, fz: -0.8 },
  explain: { ux: -0.5, out: 0.06, fx: -1.45, fy: -0.3, fz: 0 },
  shrug: { ux: -0.1, out: 0.14, fx: -0.95, fy: -1.2, fz: 0.85, both: true },
};

/** The little things people do while they wait: look round, shift their weight, scratch their head, check their
 *  phone, sip their coffee, type, wipe the counter, lean forward. */
export type Moment = "glance" | "shift" | "scratch" | "phone" | "sip" | "type" | "wipe" | "lean"
  // (second version) hands on the hips, a look at the wrist, a stretch of the neck; sitting: leaning back, the ankles
  // crossed
  | "hips" | "watch" | "neck" | "back" | "ankles";
/** How long each one lasts (seconds, from–to). */
const MOMENT_SECONDS: Record<Moment, [number, number]> = {
  glance: [1.6, 3], shift: [4, 8], scratch: [1.3, 1.9], phone: [3, 6], sip: [1.8, 2.4], type: [3, 6], wipe: [3, 6], lean: [3, 5],
  hips: [4, 8], watch: [1.6, 2.4], neck: [2.2, 3.2], back: [5, 9], ankles: [6, 12],
};

/** Shows or hides a part of the baked mesh: a hidden part's bone shrinks to a point. */
function vis(o: THREE.Object3D, on: boolean) {
  if (!on) o.scale.setScalar(1e-5);
  else if (o.scale.x < 0.5) o.scale.setScalar(1);
}

/** Sitting, the thighs slope down this much from the hip (radians), and the shins hang straight down. */
const SIT_DROOP = 0.1;
/** The elbow's bend with a café cup held on the table (the cup is built upright for it), and with a coffee to go
 *  carried in front. */
/** A blink's length (seconds). */
const BLINK = 0.2;
const CUP_ELBOW = 0.62, CUP_ARM = 0.5, COFFEE_ELBOW = 1.2;
/** The elbow below the shoulder and the hand's middle below the elbow (in the person's height). */
const ELBOW = 0.27, HAND = 0.235;

/** A part that never hides and sits square in its group: the group itself is its bone (see bake), which saves the
 *  scene a node. */
function rigid(parent: THREE.Object3D, m: THREE.Mesh) { m.userData.rigid = true; parent.add(m); return m; }
/** Seated hands (the left arm's x and z turns and its elbow's bend, then the right's): on the lap, round a cup on a
 *  café table, on a desk, holding a newspaper up. */
const SEATED_HANDS: Record<string, [number, number, number, number, number, number]> = {
  lap: [-0.3, 0.3, -0.95, -0.3, -0.3, -0.95], wipe: [-0.3, 0.3, -0.95, -0.3, -0.3, -0.95],
  cup: [-0.3, 0.3, -0.95, -0.5, -0.1, -CUP_ELBOW], type: [-0.5, 0.12, -0.8, -0.5, -0.12, -0.8],
  paper: [-0.62, 0.3, -0.8, -0.62, -0.3, -0.8],
};

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
  /** The forearms with their hands, on the elbows. */
  private foreL = new THREE.Group();
  private foreR = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private shinL = new THREE.Group();
  private shinR = new THREE.Group();
  // the parts are meshes while they are built, and bones of the baked mesh after (see bake)
  /** The skirt hangs from the waist (shortened while sitting, so it stays out of the seat). */
  private skirt: THREE.Object3D | null = null;
  /** The eyes (their whites and lash lines: squashed for a blink), the irises with their pupils and highlights (they move
   *  as the person looks), and the shut lids (shown for the blink's middle). */
  private eyes = new THREE.Group();
  private iris!: THREE.Object3D;
  private lids!: THREE.Object3D;
  private browL!: THREE.Object3D;
  private browR!: THREE.Object3D;
  private browY = 0;
  /** The closed mouth (a stroke; its ends follow `corners`, up for a smile, down for a frown) and the open one. */
  private smile!: THREE.Object3D;
  private corners!: THREE.Object3D;
  private mouth!: THREE.Object3D;
  /** The phone in the right hand, shown while they look at it. */
  private phone: THREE.Object3D | null = null;
  /** The shins with their feet: standing, and longer ones for sitting (built when the character first sits). */
  private shins: THREE.Object3D[] = [];
  private seatShins: THREE.Object3D[] | null = null;
  private seatShinExtra = 0;
  /** Every part's geometry (in its bone's space) and its bone; the baked mesh. */
  private parts: { bone: THREE.Object3D; geo: THREE.BufferGeometry | null; blend?: { to: THREE.Object3D; w: Float32Array } }[] = [];
  private skin: THREE.SkinnedMesh | null = null;
  /** (graphics round 5, theme.ts `farPeople`) The same person in fewer triangles, on the same skeleton: drawn instead
   *  of the full one when far from the camera (setFar). */
  private farSkin: THREE.SkinnedMesh | null = null;

  /** This look built with fewer sides to its round shapes (Q), to lend its mesh to a Character of the same look
   *  (attachFar). */
  static far(look: Look, detail = 0.35): Character {
    Q = detail;
    try { return new Character(look); } finally { Q = 1; }
  }

  /** Takes `twin`'s mesh (Character.far of the same look, posed the same: seated if this one is) as this one's far
   *  version, on this one's skeleton: the parts were built in the same order, so each vertex follows the same bone.
   *  False if the two don't match. */
  attachFar(twin: Character): boolean {
    const skin = this.skin, t = twin.skin;
    if (!skin || !t || twin.parts.length !== this.parts.length) return false;
    const far = new THREE.SkinnedMesh(t.geometry, charMaterial());
    far.castShadow = skin.castShadow;
    far.boundingSphere = skin.boundingSphere!.clone();
    far.boundingBox = skin.boundingBox!.clone();
    far.visible = false;
    this.root.add(far);
    far.updateMatrixWorld(true);
    far.bind(skin.skeleton, skin.bindMatrix);
    t.removeFromParent();
    t.skeleton.dispose();
    this.farSkin = far;
    return true;
  }

  /** Drawn as the far version (attachFar) or the full one. */
  setFar(on: boolean) {
    if (!this.farSkin || !this.skin || this.farSkin.visible === on) return;
    this.farSkin.visible = on;
    this.skin.visible = !on;
  }
  /** The player is close by or talking with them: no fidgeting, their attention is on the player. */
  attentive = false;
  /** Little things they do while they wait (looking round, shifting their weight…): townspeople do, the player
   *  doesn't. */
  fidgets = true;
  /** What their hands are busy with while they wait: wiping a counter, typing (a till, a keyboard), a cup at a café
   *  table, a newspaper. */
  busy: "wipe" | "type" | "cup" | "paper" | null = null;
  private moment: { kind: Moment; t: number; dur: number; s: number; w: number } | null = null;
  private momentT = 1 + Math.random() * 5;
  private legLook!: { h: number; b: number; shin: THREE.ColorRepresentation; shoes: string; skin: THREE.ColorRepresentation; flipflops: boolean };
  /** While talking: how loud the voice is right now (0–1; -1 once it has ended), or null with no recording to follow. */
  private level: (() => number | null) | null = null;
  /** And how round the sound is (0: a wide "ee", 1: a round "oo"), or null when that isn't known. */
  private vowel: (() => number | null) | null = null;
  private mouthOpen = 0;
  private mouthRound = 0.3;
  private browLift = 0;
  /** The phrase being spoken: the voice's slow level (a beat is the voice rising well above it), how long it has been
   *  quiet, the beat's fading pulse, and the hands' gesture (its weight easing in and out). */
  private lvSlow = 0;
  private quietT = 1;
  private beat = 0;
  private phraseT = 0;
  private gesture: { kind: Gesture; side: 1 | -1; w: number; t: number; dur: number } = { kind: "rest", side: 1, w: 0, t: 0, dur: 0 };
  /** The face: the person's own expression, the one asked for a while (express), and what shows now (eased). */
  mood: Mood = "friendly";
  private moodNow: { kind: Mood; t: number } | null = null;
  private face = { ...FACES.friendly };
  /** Where the learner is (a point in the world, kept up to date by the game: the player's head), or null: the eyes
   *  and the head turn to it when it is near, a glance for passers-by, steadily for someone `attentive`. */
  watch: THREE.Vector3 | null = null;
  /** How near the watched point must come for a glance (m). */
  noticeWithin = 4.5;
  /** Their eyes stay on the watched point (someone taking part in the conversation); otherwise they look at it now and
   *  then (more often when `attentive`). */
  steady = false;
  private gazeYaw = 0;
  private gazePitch = 0;
  private eyeX = 0;
  private eyeY = 0;
  private looking = false;
  /** A look aside while thinking of what to say (seconds left, and which way). */
  private avertT = 0;
  private avertX = 0;
  /** A glance at the watched point under way (seconds left), and the pause before the next. */
  private noticeT = 0;
  private noticeWait = Math.random() * 2;
  /** The eyes' own small movements with nothing to watch. */
  private saccade = { x: 0, y: 0, t: 0.5 + Math.random() * 2 };
  /** The weight on one leg or the other (−1…1, eased), and when it shifts next. */
  private stance = 0;
  private stanceTo = Math.random() < 0.5 ? -1 : 1;
  private stanceT = 1 + Math.random() * 6;
  /** This person's own: how old they hold themselves (0–1), how lively they are (0–1), how fast they breathe and
   *  sway. */
  private stoop = 0;
  private energy = 0.5;
  private breathRate = 1.6;
  private swayRate = 0.5;
  private female = false;
  /** Leaning back on a lounger (radians from upright; the Spanish edition's beach), while sitting. */
  recline = 0;
  /** The coffee to go is carried in front, the elbow bent; the bag hangs from a straight arm. */
  private holds: "coffee" | "bag" | null = null;
  /** A short reaction to the learner's answer: a nod (understood), a puzzled tilt (not understood), applause (the
   *  task is done; `clapNext`: after the nod under way). */
  private reaction: { kind: "nod" | "puzzled" | "clap"; t: number } | null = null;
  private clapNext = false;
  private t = Math.random() * 10;
  anim: Anim = "idle";
  talking = 0;
  speed = 0;
  /** How fast the character really moves (m/s): the steps keep pace with it, so the feet don't slide. */
  moveSpeed = 0;
  /** Leaning sideways into a turn (radians, + to the left). */
  bank = 0;
  /** A hop (Game: movement.ts Hop): how high the body is drawn off the ground (m; the character stays on the ground for
   *  everything else, its shadow too), how far the legs tuck up (0–1), and the landing's squash (0–1; a little stretch
   *  below 0). */
  lift = 0;
  tuck = 0;
  squash = 0;
  private hopShown = false;
  private walkPhase = 0;
  /** Where the legs are in their swing (radians, growing as they walk): a foot comes down at every π/2 + kπ. */
  get stepPhase() { return this.walkPhase; }
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
    this.buildCarried(look, h, b);
    this.busy = look.carry === "cup" || look.carry === "paper" ? look.carry : null;
    this.holds = look.carry === "coffee" || look.carry === "bag" ? look.carry : null;
    // this person's own way of standing and moving: older with grey hair or laugh lines, and a temperament drawn from
    // the look (the same every time they are built)
    const hsl = { h: 0, s: 0, l: 0 };
    new THREE.Color(look.hair.color).getHSL(hsl);
    const grey = hsl.s < 0.14 && hsl.l > 0.38;
    this.stoop = grey ? 0.55 + trait(look, 3) * 0.45 : look.face?.lines ? 0.4 : 0;
    this.energy = THREE.MathUtils.clamp(trait(look, 1) * 1.1 - this.stoop * 0.35, 0, 1);
    this.breathRate = 1.35 + trait(look, 2) * 0.6 - this.stoop * 0.15;
    this.swayRate = 0.38 + trait(look, 4) * 0.3;
    // from here on the parts are bones of one mesh
    const bone = this.bake();
    this.iris = bone(this.iris); this.lids = bone(this.lids);
    this.browL = bone(this.browL); this.browR = bone(this.browR);
    this.smile = bone(this.smile); this.corners = bone(this.corners); this.mouth = bone(this.mouth);
    this.browY = this.browL.position.y;
    if (this.skirt) this.skirt = bone(this.skirt);
    if (this.phone) { this.phone = bone(this.phone); vis(this.phone, false); }
    this.shins = this.shins.map(bone);
    vis(this.mouth, false);
    vis(this.lids, false);
  }

  // ------------------------------------------------------------------ body

  private buildBody(look: Look, acc: string[], h: number, b: number) {
    const skin = skinTone(look.skin), top = look.top, bottom = look.bottom, shoes = look.shoes ?? "#3a2f2a";
    const ac = look.accColor ?? "#2f7d6b";
    const P = new Parts();
    // a woman's or a man's figure: as the look says, else guessed from the hair, a skirt, a beard
    const female = this.female = look.female ?? ((look.skirt || ["long", "wavy", "bob", "bun", "ponytail", "braid"].includes(look.hair.style)) && !acc.includes("beard") && !acc.includes("mustache"));
    const suit = look.swim === "suit";
    // the torso: from the hips up over the waist and the chest to the shoulders, then in to the neck (its radius at
    // each height, in the old capsule's radius `tr`; a little narrower at the waist, more so for a woman, whose
    // shoulders are narrower and hips wider); trousers from the waist down (they follow the torso's rounded bottom)
    const tr = 0.25 * b, waist = 0.86 * h;
    const SHAPE: [number, number][] = female
      ? [[0.8, 1.0], [0.86, 0.94], [0.94, 0.85], [1.02, 0.9], [1.1, 0.95], [1.17, 0.9], [1.225, 0.83], [1.27, 0.68], [1.305, 0.48]]
      : [[0.8, 0.96], [0.86, 0.93], [0.94, 0.91], [1.02, 0.96], [1.1, 1.0], [1.17, 0.98], [1.225, 0.9], [1.27, 0.74], [1.305, 0.52]];
    /** The torso's radius (across; 0.78 of it front to back) at height y. */
    const R = (y: number) => {
      const t = y / h;
      if (t <= SHAPE[0][0]) return SHAPE[0][1] * tr;
      for (let i = 1; i < SHAPE.length; i++) if (t <= SHAPE[i][0]) {
        const [a, ra] = SHAPE[i - 1], [c, rc] = SHAPE[i];
        return (ra + (rc - ra) * ((t - a) / (c - a))) * tr;
      }
      return SHAPE[SHAPE.length - 1][1] * tr;
    };
    {
      const prof: THREE.Vector2[] = [];
      // (a rounded bottom under the hips, as the capsule's was)
      for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i / 4) * (Math.PI / 2), r0 = SHAPE[0][1] * tr; prof.push(new THREE.Vector2(Math.max(1e-3, r0 * Math.cos(a)), 0.8 * h + r0 * Math.sin(a))); }
      for (const [t, r] of SHAPE) prof.push(new THREE.Vector2(r * tr, t * h));
      prof.push(new THREE.Vector2(1e-3, 1.345 * h));
      P.add(G.lathe(prof, 14).scale(1, 1, 0.78), top);
    }
    if (!look.skirt) {
      const r = SHAPE[0][1] * tr + 0.006, prof: THREE.Vector2[] = [];
      for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); prof.push(new THREE.Vector2(Math.max(1e-3, r * Math.cos(a)), 0.8 * h + r * Math.sin(a))); }
      prof.push(new THREE.Vector2(R(waist) + 0.006, waist));
      // (a one-piece swimsuit, Look.swim: in the top's colour down to the legs)
      P.add(G.lathe(prof, 16).scale(1, 1, 0.78), suit ? top : bottom);
      if (look.swim === "trunks") {
        // swim shorts: a white drawstring's bow at the waist
        for (const sx of [-1, 1]) P.add(new THREE.BoxGeometry(0.012, 0.07, 0.008).rotateZ(sx * 0.35).translate(sx * 0.018, waist - 0.05, (R(waist - 0.05) + 0.006) * 0.78 + 0.004), "#ffffff");
      }
    } else {
      // a flared skirt from the waist, on its own mesh (see sit)
      const sk = new Parts();
      sk.add(G.cylinder(R(waist) + 0.014, 0.34 * b, 0.38 * h, 16).scale(1, 1, 0.84).translate(0, -0.19 * h, 0), bottom);
      if (acc.includes("sarong")) {
        // a sarong: tied in a knot on the left hip, its two ends hanging, a lighter band along its edge and its hem
        const light = new THREE.Color(bottom).lerp(new THREE.Color("#ffffff"), 0.55);
        const kx = -(R(waist) + 0.02), ky = -0.03 * h;
        sk.add(G.sphere(0.04, 8, 6).translate(kx, ky, 0.07), light);
        for (const dz of [0.03, 0.1]) sk.add(new THREE.BoxGeometry(0.02, 0.17 * h, 0.05).rotateX(dz > 0.05 ? 0.25 : -0.1).translate(kx - 0.012, ky - 0.09 * h, dz + 0.03), light);
        sk.add(G.torus(0.34 * b - 0.004, 0.011, 4, 18).rotateX(Math.PI / 2).scale(1, 1, 0.84).translate(0, -0.365 * h, 0), light);
      }
      // (a hipil: a band of flowers round the hem)
      if (acc.includes("hipil")) for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, yy = -0.31 * h, r0 = R(waist) + 0.014, rr = r0 + (0.34 * b - r0) * (0.31 / 0.38) + 0.006;
        sk.add(G.circle(0.026, 5).rotateY(Math.PI / 2 - a).translate(Math.cos(a) * rr, yy, Math.sin(a) * rr * 0.84), FLOWERS[i % FLOWERS.length]);
        sk.add(G.circle(0.013, 3).rotateY(Math.PI / 2 - a).translate(Math.cos(a + 0.2) * rr, yy - 0.03, Math.sin(a + 0.2) * rr * 0.84), "#2a9d5c");
      }
      this.skirt = sk.mesh();
      this.skirt.position.y = waist;
      this.body.add(this.skirt);
    }
    // neck
    P.add(G.cylinder(0.07, 0.08, 0.12, 10).translate(0, 1.3 * h, 0), skin);
    // ---- clothes and things worn on the body
    /** The torso's front surface at height y. */
    const front = (y: number) => R(y) * 0.78;
    if (acc.includes("apron")) {
      // a panel curving round the front, from the shins' top to the chest
      const y0 = 0.5 * h, y1 = 1.18 * h;
      P.add(G.cylinder(tr + 0.012, tr + 0.03, y1 - y0, 14, 1, true, -0.95, 1.9).scale(1, 1, 0.8).translate(0, (y0 + y1) / 2, 0), ac);
      P.add(G.torus(R(0.9 * h) + 0.012, 0.012, 4, 20).rotateX(Math.PI / 2).scale(1, 1, 0.8).translate(0, 0.9 * h, 0), ac);
    }
    if (acc.includes("waistapron")) {
      // a waiter's apron from the waist to the knees, its band round the waist
      const y0 = 0.5 * h, y1 = 0.9 * h;
      P.add(G.cylinder(tr + 0.014, tr + 0.04, y1 - y0, 14, 1, true, -1.15, 2.3).scale(1, 1, 0.8).translate(0, (y0 + y1) / 2, 0), ac);
      P.add(G.torus(R(0.895 * h) + 0.012, 0.014, 4, 20).rotateX(Math.PI / 2).scale(1, 1, 0.8).translate(0, 0.895 * h, 0), ac);
    }
    if (acc.includes("vest") || acc.includes("cardigan")) {
      // open at the front, so the top shows
      const prof: THREE.Vector2[] = [];
      prof.push(new THREE.Vector2(R(waist - 0.07) + 0.016, waist - 0.07));
      for (const [t] of SHAPE) if (t * h > waist - 0.07 && t <= 1.27) prof.push(new THREE.Vector2(Math.max(0.06, R(t * h) + 0.012), t * h + (t > 1.2 ? 0.012 : 0)));
      const c = acc.includes("cardigan") ? ac : look.accColor ?? "#6d8f3e";
      P.add(G.lathe(prof, 18, 0.32, Math.PI * 2 - 0.64).scale(1, 1, 0.8), c);
    }
    if (acc.includes("coverup")) {
      // a light shirt worn open over a swimsuit, down to the hips (in accColor)
      const prof: THREE.Vector2[] = [new THREE.Vector2(R(0.74 * h) + 0.03, 0.74 * h)];
      for (const [t] of SHAPE) if (t <= 1.27) prof.push(new THREE.Vector2(Math.max(0.06, R(t * h) + 0.014), t * h + (t > 1.2 ? 0.012 : 0)));
      P.add(G.lathe(prof, 18, 0.42, Math.PI * 2 - 0.84).scale(1, 1, 0.8), ac);
    }
    // the torso's front surface at (x, y): an ellipse across (R, R·0.78)
    const frontAt = (x: number, y: number) => Math.sqrt(Math.max(0, R(y) ** 2 - x * x)) * 0.78;
    if (acc.includes("embroidered") || acc.includes("hipil")) {
      // flowers round a square neckline, front and back: red, pink, yellow and blue, a green leaf by each
      const y0 = 1.17 * h, pts: [number, number][] = [];
      for (let i = 0; i < 7; i++) pts.push([-0.15 + i * 0.05, y0]);
      for (const sx of [-1, 1]) for (let j = 1; j <= 2; j++) pts.push([sx * 0.15, y0 + j * 0.05]);
      pts.forEach(([x, y], i) => {
        P.add(G.circle(0.022, 5).rotateY(Math.atan2(x, frontAt(x, y) * 1.6)).translate(x, y, frontAt(x, y) + 0.004), FLOWERS[i % FLOWERS.length]);
        P.add(G.circle(0.011, 3).translate(x + 0.02, y - 0.017, frontAt(x + 0.02, y - 0.017) + 0.003), "#2a9d5c");
      });
    }
    if (acc.includes("guayabera")) {
      // its pleats (alforzas) down the front either side of the buttons, a pocket low on each side, the buttons
      const pc = new THREE.Color(top).multiplyScalar(0.84), y = 1.0 * h, len = 0.3 * h;
      for (const sx of [-1, 1]) {
        for (const x of [0.065, 0.1, 0.135]) P.add(new THREE.BoxGeometry(0.011, len, 0.008).translate(sx * x, y + 0.02, frontAt(x, y) + 0.003), pc);
        P.add(new THREE.BoxGeometry(0.085, 0.075, 0.008).translate(sx * 0.12, 0.89 * h, frontAt(0.12, 0.89 * h) + 0.004), pc);
      }
      for (let i = 0; i < 4; i++) { const by = 0.88 * h + i * 0.085 * h; P.add(G.circle(0.012, 5).translate(0, by, frontAt(0, by) + 0.005), "#f4f1ea"); }
    }
    if (acc.includes("rebozo")) {
      // a shawl round the shoulders, its two ends hanging down the front, fringed
      P.add(G.torus(0.21, 0.04, 6, 20).rotateX(Math.PI / 2).scale(1.18 * b, 0.65, 0.92).translate(0, 1.225 * h, -0.005), ac);
      for (const sx of [-1, 1]) {
        const x = sx * 0.16, y = 0.97 * h, z = frontAt(x, y) + 0.02;
        P.add(new THREE.BoxGeometry(0.105, 0.44 * h, 0.03).rotateZ(-sx * 0.06).translate(x, y, z), ac);
        for (let i = 0; i < 4; i++) P.add(new THREE.BoxGeometry(0.012, 0.05, 0.012).translate(x - 0.04 + i * 0.027 + sx * 0.012, y - 0.22 * h - 0.025, z), ac);
      }
    }
    if (look.hair.style === "braid") {
      // the braid from behind the right ear over the shoulder and down the front: plaited lobes, a tie, the tuft
      const pts: [number, number, number][] = [[0.17, 1.4, -0.1], [0.2, 1.31, 0.0], [0.19, 1.22, 0.1], [0.17, 1.13, 0.16], [0.16, 1.04, 0.18], [0.155, 0.96, 0.185], [0.15, 0.89, 0.185]];
      pts.forEach(([x, y, z], i) => {
        const r = 0.05 - i * 0.003;
        P.add(G.sphere(r, 6, 4).scale(1, 1.25, 0.8).translate(x + (i % 2 ? 0.012 : -0.012), y * h, Math.max(z, frontAt(x, y * h) + r * 0.55)), look.hair.color);
      });
      P.add(G.cylinder(0.03, 0.03, 0.025, 8).translate(0.15, 0.85 * h, frontAt(0.15, 0.85 * h) + 0.03), "#e4007c");
      P.add(G.cone(0.04, 0.09, 8).rotateX(Math.PI).translate(0.15, 0.8 * h, frontAt(0.15, 0.8 * h) + 0.03), look.hair.color);
    }
    if (acc.includes("tie")) {
      const ty = 1.08 * h;
      P.add(new THREE.BoxGeometry(0.06, 0.3, 0.016).translate(0, ty - 0.02, front(ty) + 0.008), ac);
      P.add(new THREE.BoxGeometry(0.075, 0.05, 0.03).translate(0, 1.25 * h, front(1.25 * h) + 0.01), ac);
    }
    if (acc.includes("bowtie")) {
      const by = 1.26 * h, bz = front(by) + 0.02;
      for (const s of [-1, 1]) P.add(G.cone(0.035, 0.07, 8).rotateZ(-s * Math.PI / 2).translate(s * 0.035, by, bz), ac);
      P.add(G.sphere(0.018, 8, 6).translate(0, by, bz + 0.004), ac);
    }
    if (acc.includes("scarf")) {
      P.add(G.torus(0.13, 0.05, 8, 16).rotateX(Math.PI / 2).translate(0, 1.29 * h, 0.01), ac);
      P.add(G.capsule(0.035, 0.16, 3, 8).scale(1.2, 1, 0.5).rotateZ(0.12).translate(0.07, 1.13 * h, front(1.13 * h) + 0.02), ac);
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
        const g = G.cylinder(0.006, 0.006, len, 4).translate(0, len / 2, 0);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
        P.add(g.translate(a.x, a.y, a.z), "#2c5d8a");
      }
    }
    if (look.backpack) {
      // the player's backpack: a pack on the back with a flap and a pocket, its straps over the shoulders and down the
      // chest (so it shows from the front too)
      const pack = new THREE.Color(look.backpack), strap = pack.clone().multiplyScalar(0.7);
      const bz = -tr * 0.78 - 0.075;
      P.add(new THREE.BoxGeometry(0.36 * b, 0.42 * h, 0.17).translate(0, 1.0 * h, bz), pack);
      P.add(new THREE.BoxGeometry(0.38 * b, 0.1 * h, 0.18).translate(0, 1.19 * h, bz - 0.004), strap);
      P.add(new THREE.BoxGeometry(0.24 * b, 0.15 * h, 0.06).translate(0, 0.9 * h, bz - 0.1), strap);
      for (const s of [-1, 1]) {
        P.add(new THREE.BoxGeometry(0.055, 0.05, 0.36).translate(s * 0.12 * b, 1.27 * h, -0.03), strap);
        P.add(new THREE.BoxGeometry(0.055, 0.3 * h, 0.02).translate(s * 0.12 * b, 1.08 * h, front(1.08 * h) + 0.012), strap);
      }
    }
    rigid(this.body, P.mesh());

    // legs: a thigh from the hip, a shin with the shoe from the knee (they bend for walking and sitting)
    const trunks = look.swim === "trunks";
    const bare = look.skirt || look.shorts || suit || trunks;
    const legC = bare ? skin : bottom;
    this.legLook = { h, b, shin: legC, shoes, skin, flipflops: !!look.flipflops };
    for (const [leg, shin, x] of [[this.legL, this.shinL, -0.12 * b], [this.legR, this.shinR, 0.12 * b]] as [THREE.Group, THREE.Group, number][]) {
      leg.position.set(x, 0.66 * h, 0);
      const T = new Parts();
      T.add(G.capsule(0.1 * b, 0.21 * h, 3, 9).translate(0, -0.195 * h, 0), legC);
      // shorts: a wide leg over the upper thigh (swim shorts reach the knee, a white stripe down their side)
      if (look.shorts && !trunks) T.add(G.cylinder(0.118 * b, 0.124 * b, 0.22 * h, 12).translate(0, -0.12 * h, 0), bottom);
      if (trunks) {
        T.add(G.cylinder(0.118 * b, 0.128 * b, 0.29 * h, 12).translate(0, -0.15 * h, 0), bottom);
        T.add(new THREE.BoxGeometry(0.012, 0.27 * h, 0.05).translate(Math.sign(x) * 0.126 * b, -0.15 * h, 0), "#ffffff");
      }
      rigid(leg, T.mesh());
      shin.position.y = -0.3 * h;
      const m = this.shinMesh(0);
      this.shins.push(m);
      shin.add(m);
      leg.add(shin);
      this.body.add(leg);
    }
    // arms: the upper arm from the shoulder, the forearm with its hand from the elbow (cardigan sleeves in its colour;
    // Look.sleeves: short ones end above the elbow, none leaves the arm bare)
    const sleeve = acc.includes("cardigan") || acc.includes("coverup") ? ac : top;
    const sleeves = acc.includes("cardigan") ? "long" : acc.includes("coverup") ? "short" : look.sleeves ?? (suit ? "none" : "long");
    const sx = (female ? 0.315 : 0.33) * b;
    for (const [arm, fore, s] of [[this.armL, this.foreL, -1], [this.armR, this.foreR, 1]] as [THREE.Group, THREE.Group, number][]) {
      arm.position.set(s * sx, 1.2 * h, 0);
      const A = new Parts();
      A.add(G.capsule(0.075 * b, (ELBOW - 0.035) * h, 3, 8).translate(0, -(ELBOW + 0.035) / 2 * h, 0), sleeves === "none" ? skin : sleeve);
      // (a short sleeve: the arm bare below it, the sleeve a little wider)
      if (sleeves === "short") {
        A.add(G.capsule(0.07 * b, 0.11 * h, 2, 8).translate(0, -(ELBOW - 0.055) * h, 0), skin);
        A.add(G.cylinder(0.08 * b, 0.086 * b, 0.05 * h, 8).translate(0, -0.135 * h, 0), sleeve);
      }
      rigid(arm, A.mesh());
      fore.position.set(0, -ELBOW * h, 0);
      const F = new Parts();
      F.add(G.capsule(0.071 * b, 0.17 * h, 3, 8).translate(0, -0.085 * h, 0), sleeves === "long" ? sleeve : skin);
      // the hand: a mitten, flat towards the thigh, its thumb to the front
      F.add(G.sphere(0.07 * b, 7, 5).scale(0.66, 1, 0.92).translate(0, -HAND * h, 0.004), skin);
      F.add(G.capsule(0.021 * b, 0.03, 1, 4).rotateX(0.7).translate(-s * 0.012, -(HAND - 0.012) * h, 0.058 * b), skin);
      rigid(fore, F.mesh());
      arm.add(fore);
      this.body.add(arm);
    }
  }

  /** What they carry (Look.carry, Look.phone): a coffee to go in the right hand, a shopping bag in the left, a café
   *  cup held on the table, a newspaper held in front with both hands, a phone (hidden until they look at it). Each is
   *  its own part, so it follows its hand. */
  private buildCarried(look: Look, h: number, b: number) {
    // (in the forearm's space: the hand's middle)
    const hand = -HAND * h;
    const part = (P: Parts, parent: THREE.Object3D) => { const m = P.mesh(); parent.add(m); return m; };
    if (look.carry === "coffee") {
      // carried in front, the elbow bent (COFFEE_ELBOW; built upright for it): a paper cup with a sleeve and a lid
      const P = new Parts();
      const g = (geo: THREE.BufferGeometry) => geo.rotateX(COFFEE_ELBOW).translate(0, hand - 0.005, 0.085);
      P.add(g(G.cylinder(0.042, 0.034, 0.13, 12).translate(0, 0.01, 0)), "#f4f1ea");
      P.add(g(G.cylinder(0.041, 0.037, 0.05, 12)), "#a8743f");
      P.add(g(G.cylinder(0.045, 0.045, 0.018, 12).translate(0, 0.083, 0)), "#ffffff");
      part(P, this.foreR);
    } else if (look.carry === "bag") {
      // a paper shopping bag hanging from the left hand, its handles in the fist
      const c = ["#c8a272", "#e76f51", "#2a9d8f", "#f4f1ea"][Math.floor(new THREE.Color(look.top).r * 3.99)];
      const P = new Parts();
      P.add(new THREE.BoxGeometry(0.27, 0.3, 0.12).translate(0, hand - 0.24, 0), c);
      P.add(new THREE.BoxGeometry(0.27, 0.035, 0.124).translate(0, hand - 0.105, 0), new THREE.Color(c).multiplyScalar(0.8));
      for (const s of [-1, 1]) P.add(new THREE.BoxGeometry(0.014, 0.1, 0.014).translate(s * 0.05, hand - 0.05, 0), "#3a2f2a");
      part(P, this.foreL);
    } else if (look.carry === "cup") {
      // a café cup held on the table (the arm reaches forward to it, see update): turned so it stands upright there
      const P = new Parts();
      const g = (geo: THREE.BufferGeometry) => geo.rotateX(CUP_ARM + CUP_ELBOW).translate(0, hand, 0.06);
      P.add(g(G.cylinder(0.046, 0.038, 0.085, 12)), "#ffffff");
      P.add(g(G.cylinder(0.04, 0.04, 0.004, 12).translate(0, 0.041, 0)), "#5b3a26");
      P.add(g(G.torus(0.022, 0.007, 4, 8, Math.PI).rotateZ(-Math.PI / 2).translate(0.046, 0.0, 0)), "#ffffff");
      part(P, this.foreR);
    } else if (look.carry === "paper") {
      // a newspaper held open in front, tipped back towards the reader (the arms hold it, see update)
      const P = new Parts();
      const g = (geo: THREE.BufferGeometry) => geo.rotateX(-0.45).translate(0, 1.04 * h, 0.4 * b);
      P.add(g(new THREE.BoxGeometry(0.54, 0.38, 0.01)), "#f1ede3");
      for (const [y, w] of [[0.13, 0.4], [0.08, 0.44], [0.02, 0.44], [-0.04, 0.44], [-0.1, 0.3]] as [number, number][]) {
        for (const z of [-0.0065, 0.0065]) P.add(g(new THREE.BoxGeometry(w, y === 0.13 ? 0.04 : 0.016, 0.004).translate(0, y, z)), y === 0.13 ? "#3b3f45" : "#9aa0a6");
      }
      part(P, this.body);
    }
    if (look.phone) {
      // flat along the hand, the screen towards the face while they look at it
      const P = new Parts();
      P.add(new THREE.BoxGeometry(0.072, 0.012, 0.14).translate(0, hand - 0.07, 0.02), "#26292e");
      P.add(new THREE.BoxGeometry(0.06, 0.004, 0.12).translate(0, hand - 0.062, 0.02), "#9fd8ff");
      this.phone = part(P, this.foreR);
    }
  }

  /** One shin with its foot, `extra` longer than a standing one (seated feet reach the floor). */
  private shinMesh(extra: number) {
    const { h, b, shin, shoes, skin, flipflops } = this.legLook;
    const S = new Parts();
    S.add(G.capsule(0.096 * b, 0.21 * h + extra, 3, 9).translate(0, -0.105 * h - extra / 2, 0), shin);
    const y = -0.3 * h - extra;
    if (flipflops) {
      // a sole, the bare foot on it and a strap across
      S.add(new THREE.BoxGeometry(0.17 * b, 0.03, 0.28).translate(0, y - 0.035, 0.05), shoes);
      S.add(new THREE.BoxGeometry(0.12 * b, 0.06, 0.22).translate(0, y + 0.01, 0.04), skin);
      S.add(new THREE.BoxGeometry(0.135 * b, 0.016, 0.035).translate(0, y + 0.042, 0.08), new THREE.Color(shoes).multiplyScalar(0.55));
    } else {
      // a shoe: a sole (a shade darker) and a rounded upper, higher at the heel's end than at the toe
      S.add(new THREE.BoxGeometry(0.17 * b, 0.03, 0.28).translate(0, y - 0.035, 0.05), new THREE.Color(shoes).multiplyScalar(0.72));
      S.add(G.sphere(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.085 * b, 0.075, 0.14).translate(0, y - 0.022, 0.05), shoes);
    }
    return S.mesh();
  }

  // ------------------------------------------------------------------ head and face

  private buildHead(look: Look, acc: string[]) {
    const skin = skinTone(look.skin), hair = look.hair.color, style = look.hair.style;
    const R = HR;
    const P = new Parts();
    P.add(G.sphere(R, 24, 18).scale(1, 1.02, 0.96), skin);
    // ears (long hair covers them)
    const covered = style === "long" || style === "wavy" || style === "bob";
    if (!covered) for (const s of [-1, 1]) P.add(G.sphere(0.05, 10, 7).scale(0.6, 1, 0.8).translate(s * R * 0.98, -0.02, -0.005), skin);
    // nose and cheeks
    P.add(onFace(G.sphere(0.027, 10, 7).scale(1.05, 0.85, 0.75), 0, -0.035, 0.006), skin.clone().multiplyScalar(0.88));
    const blush = blushColor(skin);
    for (const s of [-1, 1]) P.add(onFace(G.sphere(0.037, 12, 6).scale(1, 0.62, 0.22), s * 0.15, -0.058, -0.0015), blush);
    if (look.face?.lines) {
      // (Look.face: the lines of a life of smiling, a shade darker than the skin: beside the mouth, at the eyes' corners)
      const line = skin.clone().multiplyScalar(0.72);
      for (const s of [-1, 1]) {
        P.add(onFace(G.torus(0.03, 0.0042, 4, 8, 1.1).rotateZ(s > 0 ? -0.15 : Math.PI + 0.15 - 1.1).scale(1, 1.2, 0.5), s * 0.062, -0.085, 0.001), line);
        for (const k of [-1, 1]) P.add(onFace(new THREE.BoxGeometry(0.026, 0.0045, 0.004).rotateZ(s * k * 0.35), s * (EYE_X + 0.055), EYE_Y + k * 0.012, 0.001), line);
      }
    }
    this.buildHair(P, look, acc);
    this.buildHeadwear(P, look, acc);
    rigid(this.head, P.mesh());

    // eyes: the whites with a lash line along their top (the group squashes them for a blink), and on them the irises,
    // each with its pupil and two highlights (their own part: it moves as the person looks, see update); the shut lids
    // are a curved line each, shown for the blink's middle
    const lash = "#1d1410", eyeC = irisColor(look);
    const E = new Parts(), I = new Parts(), C = new Parts();
    for (const s of [-1, 1]) {
      const x = s * EYE_X, iy = EYE_Y - 0.001, arc = 2.2, la = 1.9;
      E.add(onFace(G.sphere(1, 12, 7).scale(0.044, 0.05, 0.022), x, EYE_Y, -0.008), "#f6f2ea");
      E.add(onFace(G.torus(0.0445, 0.0074, 3, 8, arc).rotateZ(Math.PI / 2 - arc / 2).scale(1, 1.12, 0.6), x, EYE_Y, 0.0035), lash);
      // (a big dark iris: from across a room the eye still reads as a dark dot, the white at its corners)
      I.add(onFace(G.sphere(1, 9, 4).scale(0.0335, 0.038, 0.011), x, iy, 0.006), eyeC);
      I.add(onFace(G.sphere(1, 7, 3).scale(0.019, 0.022, 0.006), x, iy, 0.0135), "#110a07");
      // the highlights, upper left and a small one lower right (the sun is to the left)
      I.add(onFace(G.sphere(0.0115, 5, 3).scale(1, 1, 0.45).translate(-0.012, 0.016, 0), x, iy, 0.0175), "#ffffff");
      I.add(onFace(G.sphere(0.0055, 4, 2).scale(1, 1, 0.45).translate(0.012, -0.015, 0), x, iy, 0.017), "#ffffff");
      C.add(onFace(G.torus(0.04, 0.0068, 3, 7, la).rotateZ(-Math.PI / 2 - la / 2).scale(1, 0.5, 0.6).translate(0, 0.012, 0), x, EYE_Y - 0.004, 0.004), lash);
    }
    const whites = E.mesh(false), iris = I.mesh(false);
    for (const m of [whites, iris]) m.geometry.translate(0, -EYE_Y, 0);
    rigid(this.eyes, whites);
    this.eyes.add(iris);
    this.iris = iris;
    this.eyes.position.y = EYE_Y;
    this.head.add(this.eyes);
    this.lids = C.mesh(false);
    this.head.add(this.lids);

    // eyebrows: soft arches in the hair colour, each its own part turning about its middle (they lift and tilt with
    // the expression, and lift while talking)
    // (Look.face: this person's own weight, arch and tilt; none: everyone's)
    const fb = look.face;
    const brow = (s: number) => {
      const B = new Parts(), bx = s * (EYE_X + 0.004), arc = fb?.arch ?? 1.05;
      const g = G.torus(0.05, fb?.brow ? 0.0095 * fb.brow : 0.0095, 5, 10, arc).rotateZ(Math.PI / 2 - arc / 2 + (fb?.tilt ? -s * fb.tilt : 0)).translate(0, -0.05, 0).scale(1, 1, 0.6);
      B.add(onFace(g, bx, BROW_Y, 0.004), browColor(hair));
      const m = B.mesh(false), z = facePoint(bx, BROW_Y);
      m.geometry.translate(-bx, -BROW_Y, -z);
      m.position.set(bx, BROW_Y, z);
      this.head.add(m);
      return m;
    };
    this.browL = brow(-1);
    this.browR = brow(1);

    // mouth: closed, a stroke whose ends follow their own joint (up: a smile; down: a frown); while talking an open one
    // (the upper teeth, the tongue) that takes its width and its height from the voice
    const bearded = acc.includes("beard");
    const mouthGroup = new THREE.Group();
    placeOnFace(mouthGroup, 0, MOUTH_Y, bearded ? 0.02 : 0.003);
    const S = new Parts();
    S.add(G.capsule(0.0088, MOUTH_W * 2, 2, 6, 8).rotateZ(Math.PI / 2).scale(1, 1, 0.6), "#8a3b3b");
    const smile = S.mesh(false);
    const corners = new THREE.Bone();
    corners.userData.joint = true;
    {
      // each point of the stroke follows the corners' joint by the square of how far out it is: a curve when it moves
      const pos = smile.geometry.attributes.position, w = new Float32Array(pos.count);
      for (let i = 0; i < pos.count; i++) w[i] = Math.min(1, (Math.abs(pos.getX(i)) / MOUTH_W) ** 2);
      smile.userData.blend = { to: corners, w };
    }
    this.smile = smile;
    this.corners = corners;
    const O = new Parts();
    O.add(G.cylinder(0.05, 0.05, 0.012, 16).rotateX(Math.PI / 2).scale(1, 0.52, 1).translate(0, -0.026, 0), "#5a1e22");
    O.add(new THREE.BoxGeometry(0.062, 0.0095, 0.004).translate(0, -0.012, 0.0065), "#fbf8f2");
    O.add(G.cylinder(0.028, 0.028, 0.012, 10).rotateX(Math.PI / 2).scale(1, 0.38, 1).translate(0, -0.039, 0.001), "#d4686e");
    this.mouth = O.mesh(false);
    mouthGroup.add(this.smile, corners, this.mouth);
    this.head.add(mouthGroup);
  }

  /** Hair styles: the face (forehead, eyes, cheeks, mouth) always stays free. */
  private buildHair(P: Parts, look: Look, acc: string[]) {
    const s = look.hair.style, c = look.hair.color, R = HR;
    const H = (g: THREE.BufferGeometry) => P.add(g, c);
    const hatted = ["cap", "hat", "police", "pilot", "chef", "strawhat", "jipi", "bandana", "sunhat", "bucket"].some((a) => acc.includes(a));
    if (s === "braid") {
      // drawn back from a middle parting to the nape, the braid itself on the body (buildBody)
      H(hairCap(1.06, 0.62));
      H(G.sphere(0.07, 10, 8).translate(0.12, -0.08, -0.2));
    } else if (s === "bald") {
      // a band round the back and the sides, at the ears
      H(G.sphere(R * 1.035, 22, 3, Math.PI - 0.12, Math.PI + 0.24, Math.PI * 0.44, Math.PI * 0.17).scale(1, 1.02, 0.97));
    } else if (s === "buzz") {
      H(G.sphere(HR * 1.04, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.02, 0.97).rotateX(-0.55).translate(0, 0.01, -0.004));
    } else if (s === "short" || s === "side") {
      H(hairCap(1.06, 0.6));
      // a tuft over the forehead (swept to one side for "side"), unless a hat covers it
      const side = s === "side";
      if (!hatted) H(G.sphere(0.14, 14, 8).scale(1, 0.36, 0.62).rotateX(-0.42).rotateZ(side ? -0.32 : 0).translate(side ? 0.05 : 0, 0.205, 0.155));
      if (side && !hatted) H(G.sphere(0.08, 10, 6).scale(1, 0.42, 0.62).rotateX(-0.55).rotateZ(-0.45).translate(0.125, 0.15, 0.175));
    } else if (s === "long" || s === "wavy") {
      const long = s === "long";
      H(hairCap(1.07, 0.52));
      // down the back, and a lock either side of the face
      const len = long ? 0.28 : 0.16;
      H(G.capsule(R * 0.86, len, 6, 14).scale(1.12, 1, 0.48).translate(0, -0.06 - len / 2, -0.165));
      for (const sd of [-1, 1]) {
        const ll = long ? 0.3 : 0.2;
        H(G.capsule(0.058, ll, 4, 10).rotateZ(sd * 0.07).translate(sd * 0.248, 0.02 - ll / 2 - 0.02, 0.035));
        if (!long) H(G.sphere(0.068, 10, 7).translate(sd * 0.255, -0.25, 0.03));
      }
      if (!long) for (let i = 0; i < 4; i++) {
        const a = -1.0 + (i / 3) * 2.0;
        H(G.sphere(0.075, 10, 7).translate(Math.sin(a) * 0.2, -0.4, -0.17 + Math.abs(Math.sin(a)) * 0.06));
      }
    } else if (s === "bob") {
      H(hairCap(1.07, 0.4));
      // straight sides and back to the chin, open at the face, the ends turned in a little
      const prof = [[0.262, -0.205], [0.3, -0.212], [0.322, -0.17], [0.31, -0.05], [0.294, 0.07]].map(([r, y]) => new THREE.Vector2(r, y));
      H(G.lathe(prof, 24, 0.98, Math.PI * 2 - 1.96).scale(1, 1, 0.97).translate(0, 0, -0.012));
    } else if (s === "bun" || s === "ponytail") {
      H(hairCap(1.06, 0.62));
      if (s === "bun") H(G.sphere(0.12, 14, 10).translate(0, 0.21, -0.2));
      else {
        H(G.sphere(0.065, 10, 8).translate(0, 0.07, -0.28));
        H(G.capsule(0.065, 0.26, 4, 10).rotateX(0.32).translate(0, -0.13, -0.33));
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
          H(G.sphere(r, 9, 7).translate(x, y, z - 0.01));
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
        const g = G.capsule(0.016, 0.04, 3, 8).rotateZ(Math.PI / 2 - sd * 0.38).scale(1, 1, 0.6);
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
        P.add(lens(G.torus(0.055, 0.011, 6, 18)), gm);
        if (sun) P.add(lens(G.circle(0.052, 16).translate(0, 0, 0.001)), gm);
        // the arms back to the ears, round the side of the head
        const pts = [new THREE.Vector3(s * 0.146, EYE_Y + 0.008, gz - 0.022), new THREE.Vector3(s * 0.255, EYE_Y + 0.008, 0.12), new THREE.Vector3(s * 0.282, EYE_Y - 0.002, -0.03)];
        for (let i = 0; i < 2; i++) {
          const d = pts[i + 1].clone().sub(pts[i]), len = d.length();
          const g = G.cylinder(0.0075, 0.0075, len, 4).translate(0, len / 2, 0);
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
        P.add(up(G.torus(0.055, 0.011, 6, 18).rotateY(s * 0.3).translate(s * EYE_X, EYE_Y, 0.262)), gm);
        if (sun) P.add(up(G.circle(0.052, 16).rotateY(s * 0.3).translate(s * EYE_X, EYE_Y, 0.263)), gm);
      }
      P.add(up(new THREE.BoxGeometry(0.08, 0.012, 0.012).translate(0, EYE_Y + 0.012, 0.266)), gm);
    }
    if (acc.includes("cap")) {
      P.add(G.sphere(R * 1.09, 20, 8, 0, Math.PI * 2, 0, Math.PI * 0.42).translate(0, 0.045, -0.006), ac);
      P.add(G.cylinder(0.16, 0.16, 0.022, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(0.12).translate(0, 0.128, 0.215), ac);
    }
    if (acc.includes("hat") || acc.includes("police") || acc.includes("pilot")) {
      const c = acc.includes("police") ? "#1d2940" : acc.includes("pilot") ? "#1d2f52" : ac;
      P.add(G.cylinder(R * 0.96, R * 1.04, 0.15, 20).translate(0, 0.205, 0), c);
      P.add(G.cylinder(R * 1.12, R * 0.96, 0.08, 20).translate(0, 0.31, 0), c);
      P.add(G.cylinder(0.15, 0.15, 0.014, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(0.22).translate(0, 0.14, 0.2), "#111111");
      if (acc.includes("police") || acc.includes("pilot")) P.add(G.circle(0.035, 6).translate(0, 0.225, R * 1.0 + 0.002), "#e2c044");
    }
    if (acc.includes("strawhat")) {
      // a straw hat: the crown and its band, a wide brim
      P.add(G.cylinder(R * 0.9, R * 1.02, 0.15, 18).translate(0, 0.225, -0.005), "#e2c483");
      P.add(G.cylinder(R * 1.035, R * 1.035, 0.045, 18).translate(0, 0.17, -0.005), "#7a3b1d");
      P.add(G.cylinder(R * 1.8, R * 1.8, 0.022, 22).translate(0, 0.148, -0.005), "#e8cc8f");
    }
    if (acc.includes("jipi")) {
      // a jipi (the Yucatán's Panama hat): a pale creased crown, a black band, the brim
      P.add(G.cylinder(R * 0.86, R * 1.0, 0.16, 18).scale(1, 1, 1.08).translate(0, 0.225, -0.005), "#f1e3bd");
      P.add(new THREE.BoxGeometry(0.03, 0.03, R * 1.5).translate(0, 0.3, -0.005), "#d8c69c");
      P.add(G.cylinder(R * 1.01, R * 1.01, 0.045, 18).scale(1, 1, 1.08).translate(0, 0.168, -0.005), "#1d1d1d");
      P.add(G.cylinder(R * 1.6, R * 1.6, 0.02, 22).scale(1, 1, 1.05).translate(0, 0.146, -0.005), "#efe0b8");
    }
    if (acc.includes("bandana")) {
      // a cloth tied over the hair, down to the forehead, the knot and its two ends at the nape
      P.add(G.sphere(R * 1.09, 20, 8, 0, Math.PI * 2, 0, Math.PI * 0.46).rotateX(-0.28).translate(0, 0.03, -0.012), ac);
      P.add(G.sphere(0.042, 8, 6).translate(0, 0.02, -0.29), ac);
      for (const sd of [-1, 1]) P.add(new THREE.BoxGeometry(0.05, 0.15, 0.018).rotateZ(sd * 0.35).translate(sd * 0.04, -0.07, -0.29), ac);
    }
    if (acc.includes("sunhat")) {
      // a sun hat (the Spanish edition's beach): a rounded straw crown, a ribbon in accColor, a broad brim
      P.add(G.sphere(R, 18, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.62, 1).translate(0, 0.17, -0.005), "#ecd9a6");
      P.add(G.cylinder(R * 1.02, R * 1.035, 0.04, 18).translate(0, 0.178, -0.005), ac);
      const brim = [[0.98, 0.16], [1.85, 0.137], [1.85, 0.127], [0.98, 0.146]].map(([r, y]) => new THREE.Vector2(R * r, y));
      P.add(G.lathe(brim, 20).translate(0, 0, -0.005), "#e6d19a");
    }
    if (acc.includes("bucket")) {
      // a bucket hat (in accColor): a flat-topped crown and a short brim sloping down
      P.add(G.cylinder(R * 0.9, R * 1.04, 0.14, 18).translate(0, 0.215, -0.005), ac);
      const brim = [[1.03, 0.15], [1.42, 0.09], [1.42, 0.08], [1.0, 0.136]].map(([r, y]) => new THREE.Vector2(R * r, y));
      P.add(G.lathe(brim, 18).translate(0, 0, -0.005), new THREE.Color(ac).multiplyScalar(0.9));
    }
    if (acc.includes("chef")) {
      P.add(G.cylinder(R * 0.92, R * 0.96, 0.2, 20).translate(0, 0.26, -0.01), "#ffffff");
      P.add(G.sphere(R * 1.08, 20, 10).scale(1, 0.55, 1).translate(0, 0.39, -0.01), "#ffffff");
    }
    if (acc.includes("headset")) {
      const hc = "#2b2b2b";
      P.add(G.torus(R * 1.1, 0.014, 6, 22, Math.PI).translate(0, 0.02, -0.01), hc);
      for (const s of [-1, 1]) P.add(G.cylinder(0.06, 0.06, 0.04, 12).rotateZ(Math.PI / 2).translate(s * R * 1.06, -0.01, -0.01), hc);
      P.add(G.capsule(0.009, 0.15, 3, 6).rotateX(Math.PI / 2).rotateY(-0.75).translate(R * 0.82, -0.08, 0.13), hc);
      P.add(G.sphere(0.016, 8, 6).translate(R * 0.5, -0.1, 0.22), hc);
    }
    if (acc.includes("earrings")) for (const s of [-1, 1]) P.add(G.sphere(0.02, 8, 6).translate(s * R * 0.97, -0.085, 0.02), "#e2c044");
    if (acc.includes("flower")) for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      P.add(G.sphere(0.026, 8, 6).translate(-0.19 + Math.cos(a) * 0.028, 0.16 + Math.sin(a) * 0.028, 0.15), "#e84a5f");
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
        // new seated shins (the old ones go), and the mesh baked again with them
        for (const s of this.seatShins ?? []) this.dropPart(s);
        const ms = [this.shinL, this.shinR].map((g) => { const m = this.shinMesh(extra); g.add(m); return m; });
        const bone = this.bake();
        this.seatShins = ms.map(bone);
        this.seatShinExtra = extra;
      }
    }
    for (const m of this.shins) vis(m, !seated);
    for (const m of this.seatShins ?? []) vis(m, seated);
  }

  /** Bakes the parts into one skinned mesh. Each mesh built since the last bake gives way to a bone in its place and
   *  keeps its geometry (a `rigid` one takes its group as its bone; a joint without a shape of its own, like the mouth's
   *  corners, is a bone too); then every part's vertices are put where the part is now (the bind pose), each following
   *  its bone (or two: `blend`, the closed mouth's stroke and its corners). Returns the bone that took each new mesh's
   *  place. */
  private bake() {
    const fresh: THREE.Object3D[] = [];
    this.body.traverse((o) => { if ((o as THREE.Mesh).isMesh || (o.userData.joint && !this.parts.some((p) => p.bone === o))) fresh.push(o); });
    const swap = new Map<THREE.Object3D, THREE.Object3D>();
    for (const o of fresh) {
      if (!(o as THREE.Mesh).isMesh) { this.parts.push({ bone: o, geo: null }); continue; }
      const m = o as THREE.Mesh, parent = m.parent!;
      let bone: THREE.Object3D;
      if (m.userData.rigid && !this.parts.some((p) => p.bone === parent)) bone = parent;
      else {
        bone = new THREE.Bone();
        bone.position.copy(m.position); bone.quaternion.copy(m.quaternion); bone.scale.copy(m.scale);
        parent.add(bone);
      }
      m.removeFromParent();
      this.parts.push({ bone, geo: m.geometry, blend: m.userData.blend });
      swap.set(m, bone);
    }
    // the bind pose has every part at its full size (a hidden part's bone is shrunk, see vis; the eyes' is squashed in
    // a blink)
    const sizes = this.parts.map((p) => p.bone.scale.clone());
    for (const p of this.parts) p.bone.scale.set(1, 1, 1);
    this.root.updateMatrixWorld(true);
    const toRoot = this.root.matrixWorld.clone().invert(), m4 = new THREE.Matrix4();
    const geos: THREE.BufferGeometry[] = [];
    this.parts.forEach(({ bone, geo, blend }, i) => {
      if (!geo) return;
      const g = geo.clone().applyMatrix4(m4.multiplyMatrices(toRoot, bone.matrixWorld));
      const n = g.attributes.position.count;
      if (!g.index) g.setIndex([...Array(n).keys()]);
      const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      const j = blend ? this.parts.findIndex((p) => p.bone === blend.to) : -1;
      for (let k = 0; k < n; k++) {
        const w = j >= 0 ? blend!.w[k] : 0;
        si[k * 4] = i; sw[k * 4] = 1 - w;
        if (j >= 0) { si[k * 4 + 1] = j; sw[k * 4 + 1] = w; }
      }
      g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
      g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
      geos.push(g);
    });
    const castShadow = this.skin?.castShadow ?? true;
    if (this.skin) { this.skin.removeFromParent(); this.skin.geometry.dispose(); this.skin.skeleton.dispose(); }
    // (a far version on the old skeleton no longer fits: gone, until another is attached)
    if (this.farSkin) { this.farSkin.removeFromParent(); this.farSkin.geometry.dispose(); this.farSkin = null; }
    const skin = new THREE.SkinnedMesh(mergeGeometries(geos, false)!, charMaterial());
    for (const g of geos) g.dispose();
    skin.castShadow = castShadow;
    // a generous fixed bound, as the pose changes every frame (an arm up for a wave still fits)
    skin.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 1.5);
    skin.boundingBox = new THREE.Box3(new THREE.Vector3(-1.1, -0.2, -1.1), new THREE.Vector3(1.1, 2.6, 1.1));
    this.root.add(skin);
    skin.updateMatrixWorld(true);
    skin.bind(new THREE.Skeleton(this.parts.map((p) => p.bone as THREE.Bone)), skin.matrixWorld);
    this.parts.forEach((p, i) => p.bone.scale.copy(sizes[i]));
    this.skin = skin;
    return (o: THREE.Object3D): THREE.Object3D => swap.get(o) ?? o;
  }

  /** Takes a part out (its geometry goes; the next bake leaves it out). */
  private dropPart(bone: THREE.Object3D) {
    const i = this.parts.findIndex((p) => p.bone === bone);
    if (i >= 0) { this.parts[i].geo?.dispose(); this.parts.splice(i, 1); }
    bone.removeFromParent();
  }

  update(dt: number) {
    this.t += dt;
    this.blob.visible = Character.blobShadows;
    const t = this.t, h = this.look.height ?? 1, b = this.look.build ?? 1;
    const seated = this.anim === "sit", walking = this.anim === "walk" || this.anim === "run";
    const E = this.energy, old = this.stoop, clamp = THREE.MathUtils.clamp;
    let legA = 0, kneeL = 0.03, kneeR = 0.03, bob = 0, lean = 0, headNod = 0, headTurn = 0, tilt = 0, hip = 0, side = 0;
    // the arms: round x forward (negative) or back, round z out or in (the left arm + inwards, the right − inwards);
    // the elbows' bend (negative: the forearm forward and up), the forearms' twist (y) and their turn sideways (z)
    let lx = 0, lz = 0, rx = 0, rz = 0, lf = -0.14, rf = -0.14, lfy = 0, rfy = 0, lfz = 0, rfz = 0, shrug = 0;
    // (sitting: the shins' turn sideways and the right one's forward, for crossed ankles)
    let ankles = 0;
    // breathing, at this person's own pace
    const breath = Math.sin(t * this.breathRate);
    if (walking) {
      const run = this.anim === "run";
      // steps at the pace of the real speed when it is known (4.4 m/s walking, 7.4 running)
      const pace = this.moveSpeed > 0 ? clamp(this.moveSpeed / (run ? 7.4 : 4.4), 0.55, 1.3) : 1;
      this.walkPhase += dt * (run ? 11 : 7.5) * pace;
      const ph = this.walkPhase;
      const amp = (run ? 0.75 : 0.55) * Math.min(1, 0.6 + pace * 0.4);
      legA = Math.sin(ph) * amp;
      // the knee folds while that foot swings forward
      kneeL = Math.max(0, -Math.cos(ph)) * (run ? 1.1 : 0.7) + 0.05;
      kneeR = Math.max(0, Math.cos(ph)) * (run ? 1.1 : 0.7) + 0.05;
      lx = -legA * 0.85;
      rx = legA * 0.85;
      // the elbows: bent for a run; walking, they fold a little more as that arm comes forward
      lf = run ? -1.25 : -0.2 - Math.max(0, legA) * 0.45;
      rf = run ? -1.25 : -0.2 - Math.max(0, -legA) * 0.45;
      bob = Math.abs(Math.sin(ph)) * 0.05;
      lean = run ? 0.12 : 0.04;
      tilt = Math.sin(ph) * 0.012;
      this.stance *= 1 - Math.min(1, dt * 5);
    } else if (seated) {
      [lx, lz, lf, rx, rz, rf] = SEATED_HANDS[this.busy ?? "lap"];
      headTurn = Math.sin(t * this.swayRate) * 0.06;
      bob = breath * 0.004;
      // a reader looks down at the paper
      if (this.busy === "paper") headNod = 0.22;
      this.stance *= 1 - Math.min(1, dt * 5);
    } else {
      bob = breath * 0.006;
      headTurn = Math.sin(t * this.swayRate) * 0.07;
      // the weight on one leg, then the other, every few seconds (sooner for the lively)
      if ((this.stanceT -= dt) <= 0) {
        this.stanceTo = (this.stanceTo > 0 ? -1 : 1) * (0.45 + Math.random() * 0.55);
        this.stanceT = (4 + Math.random() * 9) / (0.7 + E * 0.6);
      }
      this.stance += (this.stanceTo - this.stance) * Math.min(1, dt * 1.5);
      hip = this.stance * 0.028;
      side = this.stance * 0.014;
      tilt = -this.stance * 0.02;
    }
    // the shoulders rise and widen a little with each breath
    lz -= breath * 0.008; rz += breath * 0.008;
    // what they carry: the coffee held in front, the bag hanging from a straight arm
    if (this.holds === "coffee") { rx = walking ? -0.1 + rx * 0.08 : -0.1; rz = -0.06; rf = -COFFEE_ELBOW + (walking ? Math.sin(this.walkPhase * 2) * 0.03 : 0); }
    if (this.holds === "bag") { lx *= 0.3; lf = -0.05; }
    // their own bearing: the old stoop a little, shoulders forward; the lively stand straighter
    lean += old * 0.065 - (1 - old) * (E - 0.5) * 0.024;
    headNod += old * 0.045 - (E - 0.5) * 0.03;
    if (!seated) { lx -= old * 0.07; rx -= old * 0.07; lf -= old * 0.1; rf -= old * 0.1; }
    // the little things people do while they wait (see fidget)
    const m = this.fidget(dt, seated);
    let phoneOut = false, eyesDown = this.busy === "paper" ? 1 : 0;
    if (m) {
      const k = m.w * m.w * (3 - 2 * m.w), s = m.s;
      const reach = (arm: "l" | "r", x: number, z: number, f: number, fz = 0) => {
        if (arm === "l") { lx += (x - lx) * k; lz += (z - lz) * k; lf += (f - lf) * k; lfz += (fz - lfz) * k; }
        else { rx += (x - rx) * k; rz += (z - rz) * k; rf += (f - rf) * k; rfz += (fz - rfz) * k; }
      };
      switch (m.kind) {
        // looking round (a reader looks up from the paper)
        case "glance": headTurn += s * 0.7 * k; if (this.busy === "paper") { headNod -= 0.24 * k; eyesDown = 1 - k; } break;
        // the weight well on one leg (below: the body tips over it, the other knee bends)
        case "shift": hip += s * 0.03 * k; tilt -= s * 0.03 * k; break;
        case "lean": lean += 0.07 * k; headNod -= 0.04 * k; break;
        // a hand up to the side of the head
        case "scratch": reach("r", 0, 2.5, 0, 1.55 + Math.sin(t * 16) * 0.07); tilt -= 0.09 * k; headNod += 0.05 * k; break;
        // the phone held up in front, eyes on it
        case "phone": reach("r", -0.5, -0.3, -1.45); reach("l", -0.1, 0.05, -0.3); headNod += 0.3 * k; eyesDown = k; phoneOut = m.w > 0.3; break;
        // the cup up to the mouth, the head back a little
        case "sip": reach("r", this.holds === "coffee" ? -0.6 : -0.85, -0.2, this.holds === "coffee" ? -2.05 : -1.8, -0.75); headNod -= 0.1 * k; break;
        // both hands on the counter or the desk, fingers busy, eyes down
        case "type":
          if (!seated) { reach("l", -0.42, 0.1, -0.85); reach("r", -0.42, -0.1, -0.85); }
          lf += Math.sin(t * 12) * 0.06 * k; rf += Math.sin(t * 12 + 1.7) * 0.06 * k;
          headNod += 0.2 * k; eyesDown = k;
          break;
        // circles on the counter with the right hand, the left one resting on it
        case "wipe": reach("r", -0.55 + Math.sin(t * 5) * 0.1, -0.12 + Math.cos(t * 5) * 0.16, -0.75 + Math.sin(t * 5) * 0.12); reach("l", -0.3, 0.05, -0.75); headNod += 0.18 * k; eyesDown = k; break;
        // hands on the hips, elbows out
        case "hips": reach("l", 0.12, -0.6, 0, 1.85); reach("r", 0.12, 0.6, 0, -1.85); lean -= 0.02 * k; break;
        // a look at the wrist
        case "watch": reach("l", -0.55, 0.42, -1.5); headNod += 0.28 * k; headTurn -= 0.18 * k; eyesDown = k; break;
        // the head tipped slowly to one side and the other
        case "neck": tilt += Math.sin(m.t * 2.1) * 0.2 * k; headNod -= 0.05 * k; break;
        // sitting: leaning back for a while; the ankles crossed
        case "back": lean -= 0.1 * k; headNod -= 0.03 * k; break;
        case "ankles": ankles = k * s; break;
      }
    }
    if (this.phone) vis(this.phone, phoneOut);

    // ---- talking: the mouth, the brows, the head and the hands follow the voice
    let browUp = 0, browOne = 0, open = 0, happyEyes = false;
    // with a recording to follow, the talking lasts exactly as long as it plays (it often starts a moment late)
    const lv = this.level?.() ?? null;
    if (lv !== null) this.talking = lv < 0 ? 0 : Math.max(this.talking, 0.1);
    const speaking = this.talking > 0;
    if (speaking) {
      this.talking -= dt;
      // the mouth follows the recording's loudness (pauses between words and sentences close it); with no recording
      // to follow (the browser's own voice), syllables come from two rhythms mixed
      const target = lv ?? Math.max(0, Math.min(1, Math.sin(t * 13.5) * 0.55 + Math.sin(t * 7.1 + 1.3) * 0.4 + 0.3));
      // it opens fast and closes a little slower, like a real one; the brows follow the phrase, not each syllable
      this.mouthOpen += (target - this.mouthOpen) * Math.min(1, dt * (target > this.mouthOpen ? 28 : 16));
      this.browLift += (this.mouthOpen - this.browLift) * Math.min(1, dt * 4);
      // and its shape follows the sound: round for "oo" and "oh", wide for "ee" (a slow drift when that isn't known)
      const round = (lv !== null ? this.vowel?.() : null) ?? 0.45 + 0.4 * Math.sin(t * 4.3 + 1);
      this.mouthRound += (round - this.mouthRound) * Math.min(1, dt * 16);
      // phrases and beats: a pause, then the voice again, starts a phrase (a gesture, perhaps); the voice rising well
      // above its own slow level is a beat (a small nod, the hand's stroke)
      this.lvSlow += (target - this.lvSlow) * Math.min(1, dt * 3);
      if (target < 0.08) this.quietT += dt;
      else {
        if (this.quietT > 0.22) this.phrase(seated);
        this.quietT = 0;
      }
      if (target - this.lvSlow > 0.26 && this.beat < 0.3) this.beat = 1;
      this.beat = Math.max(0, this.beat - dt * 5.5);
      headNod += this.beat * 0.055 * (0.6 + E * 0.8);
      tilt += Math.sin(t * 1.1 + this.swayRate * 9) * 0.03;
      open = this.mouthOpen;
      browUp = this.browLift * 0.012 + this.beat * 0.004;
    } else {
      this.level = this.vowel = null;
      this.mouthOpen = this.browLift = this.beat = this.lvSlow = 0;
      this.quietT = 1;
    }
    // the hands' gesture: eased in at a phrase's start, out at its end or when the voice has stopped a while
    const gs = this.gesture;
    gs.t += dt;
    gs.w = clamp(gs.w + (speaking && gs.kind !== "rest" && this.quietT < 0.5 && gs.t < gs.dur ? dt / 0.3 : -dt / 0.45), 0, 1);
    if (gs.w > 0) {
      const g = GESTURES[gs.kind], k = gs.w * gs.w * (3 - 2 * gs.w), amp = (seated ? 0.7 : 1) * (0.75 + E * 0.45), bt = this.beat;
      let ux = g.ux * amp - bt * 0.06, out = g.out, fx = g.fx * (seated ? 0.85 : 1) + bt * 0.2;
      if (gs.kind === "explain") { ux += Math.sin(t * 5.2) * 0.07; out += Math.cos(t * 5.2) * 0.07; }
      if (gs.kind === "both" || gs.kind === "shrug") out += bt * 0.08;
      const arm = (sd: number) => {
        if (sd > 0) { if (this.holds === "coffee" || this.busy === "cup") return; rx += (ux - rx) * k; rz += (out - rz) * k; rf += (fx - rf) * k; rfy += (g.fy - rfy) * k; rfz += (g.fz - rfz) * k; }
        else { if (this.holds === "bag") return; lx += (ux - lx) * k; lz += (-out - lz) * k; lf += (fx - lf) * k; lfy += (-g.fy - lfy) * k; lfz += (-g.fz - lfz) * k; }
      };
      if (this.busy !== "paper") { arm(gs.side); if (g.both) arm(-gs.side); }
      if (gs.kind === "shrug") { shrug = k; tilt += 0.07 * k * gs.side; browUp += 0.006 * k; }
    }
    // reacting to the learner's answer: two small nods (understood), or the head tilted and a brow up (not)
    if (this.reaction) {
      const r = this.reaction;
      r.t += dt;
      if (r.kind === "nod") {
        if (r.t < 0.8) headNod += Math.abs(Math.sin((r.t / 0.4) * Math.PI)) * 0.2;
        else { this.reaction = this.clapNext ? { kind: "clap", t: 0 } : null; this.clapNext = false; }
      } else if (r.kind === "clap") {
        // applause once they have had their say: the hands meet in front about three times a second, brows up, the
        // eyes shut in a smile, a bob
        if (speaking) r.t = 0;
        else if (r.t < 1.7) {
          const e = Math.min(1, r.t / 0.25, (1.7 - r.t) / 0.3), k = e * e * (3 - 2 * e), c = 0.5 + 0.5 * Math.sin(r.t * 19);
          lx += (-0.5 - lx) * k; rx += (-0.5 - rx) * k;
          lf += (-1.25 - lf) * k; rf += (-1.25 - rf) * k;
          lz += (0.34 + 0.2 * c - lz) * k; rz += (-0.34 - 0.2 * c - rz) * k;
          headNod += Math.sin(r.t * 9.5) * 0.06 * k;
          browUp = Math.max(browUp, 0.014 * k);
          happyEyes = e > 0.6;
        } else this.reaction = null;
      } else if (r.t < 1.8) {
        const e = Math.sin(Math.min(1, r.t / 1.8) * Math.PI) ** 0.5;
        tilt += 0.2 * e;
        browUp = Math.max(browUp, 0.012 * e);
        browOne = 0.016 * e;
      } else this.reaction = null;
    }
    if (this.anim === "wave") {
      // the arm up and out, the forearm waving from the elbow
      rx = 0; rz = 2.6; rf = 0; rfy = 0;
      rfz = 0.3 + Math.sin(t * 10) * 0.36;
    }

    // ---- where they look: at the learner when near (steadily if their attention is on them, else a glance now and
    // then), the eyes first and the head after; with no one to look at, the eyes wander a little
    const sc = this.saccade;
    if ((sc.t -= dt) <= 0) {
      sc.t = 0.7 + Math.random() * 2.8;
      if (Math.random() < 0.45) sc.x = sc.y = 0;
      else { sc.x = (Math.random() - 0.5) * 0.017; sc.y = (Math.random() - 0.5) * 0.007; }
    }
    let gy = 0, gp = 0, ex = sc.x, ey = sc.y - eyesDown * 0.008, looking = false;
    const wp = this.watch;
    if (wp && eyesDown < 0.5) {
      const p = this.root.position, dx = wp.x - p.x, dz = wp.z - p.z, d = Math.hypot(dx, dz);
      if (d > 0.35 && (this.steady || this.attentive || d < this.noticeWithin)) {
        if (!this.steady) {
          if (this.noticeT > 0) this.noticeT -= dt;
          else if ((this.noticeWait -= dt) <= 0) {
            this.noticeT = (this.attentive ? 2 : 1.2) + Math.random() * 2.4;
            this.noticeWait = this.attentive ? 1.2 + Math.random() * 3 : 3 + Math.random() * 8;
          }
        }
        if (this.steady || this.noticeT > 0) {
          let rel = Math.atan2(dx, dz) - this.root.rotation.y;
          rel = Math.atan2(Math.sin(rel), Math.cos(rel));
          if (Math.abs(rel) < 1.9) {
            const eyeH = p.y + (seated ? this.seatY + 0.1 * b + 0.86 * h : 1.52 * h) + this.lift;
            const pitch = Math.atan2(wp.y - eyeH, d), most = walking ? 0.6 : 0.95;
            gy = clamp(rel, -most, most) * 0.85;
            gp = clamp(-pitch, -0.4, 0.3) * 0.75;
            // (a thinking look aside as a phrase starts)
            if (this.avertT > 0) { this.avertT -= dt; ex = this.avertX; ey = 0.003; }
            else { ex = clamp(rel - this.gazeYaw, -0.5, 0.5) * 0.019; ey = clamp(pitch + this.gazePitch, -0.4, 0.4) * 0.012; }
            looking = true;
          }
        }
      } else if (this.noticeT <= 0) this.noticeWait = Math.min(this.noticeWait, 0.2 + Math.random() * 1.2);
    }
    // (people blink as their eyes move far)
    if (looking !== this.looking) { this.looking = looking; if (Math.abs(gy - this.gazeYaw) > 0.35 && this.blinkT > 0.4 && Math.random() < 0.7) this.blinkT = BLINK; }
    this.gazeYaw += (gy - this.gazeYaw) * Math.min(1, dt * (looking ? 5.5 : 3));
    this.gazePitch += (gp - this.gazePitch) * Math.min(1, dt * 5);
    this.eyeX += (ex - this.eyeX) * Math.min(1, dt * 24);
    this.eyeY += (ey - this.eyeY) * Math.min(1, dt * 24);
    headTurn = headTurn * (looking ? 0.25 : 1) + this.gazeYaw;
    headNod += this.gazePitch;
    this.iris.position.set(this.eyeX, this.eyeY, 0);

    // ---- the face: the expression asked for (express) or the person's own, eased; the brows; the mouth
    if (this.moodNow && (this.moodNow.t -= dt) <= 0) this.moodNow = null;
    const want = FACES[this.moodNow?.kind ?? this.mood], f = this.face, fk = Math.min(1, dt * 7);
    f.brow += (want.brow - f.brow) * fk; f.tilt += (want.tilt - f.tilt) * fk; f.eye += (want.eye - f.eye) * fk;
    f.smile += (want.smile - f.smile) * fk; f.oh += (want.oh - f.oh) * fk;
    const by = this.browY + f.brow + browUp;
    this.browL.position.y = by + browOne;
    this.browR.position.y = by;
    this.browL.rotation.z = f.tilt + browOne * 8;
    this.browR.rotation.z = -f.tilt;
    if (speaking && open > 0.06) {
      // open: narrow and tall for a round sound, wide and flatter for a bright one
      const rd = this.mouthRound;
      this.mouth.scale.set(1.06 - 0.46 * rd, (0.2 + 0.8 * open) * (0.9 + 0.22 * rd), 1);
      vis(this.smile, false); vis(this.corners, false);
    } else if (!speaking && f.oh > 0.5) {
      // a small round "oh"
      this.mouth.scale.set(0.42, 0.62 * f.oh, 1);
      vis(this.smile, false); vis(this.corners, false);
    } else {
      // closed: the stroke, its corners up or down with the expression (lips together between words: a smaller smile)
      vis(this.mouth, false);
      const wide = 1 + Math.max(0, f.smile) * 4.5;
      this.smile.scale.set(wide, 1, 1);
      this.corners.scale.set(wide, 1, 1);
      this.corners.position.y = f.smile * (speaking ? 0.6 : 1);
    }

    if (seated) {
      // thighs along the seat, the shins (longer, see fitLegs) straight down to the floor; on a lounger (recline) the
      // back leans, turning about the hips, and the legs lie out along it
      const rc = this.recline, out = Math.min(1, rc / 0.6), shin = (Math.PI / 2 - SIT_DROOP) * (1 - out) + 0.2 * out;
      this.legL.rotation.set(-Math.PI / 2 + SIT_DROOP + rc, 0, 0);
      this.legR.rotation.set(-Math.PI / 2 + SIT_DROOP + rc, 0, 0);
      this.shinL.rotation.set(shin, 0, ankles * 0.17);
      this.shinR.rotation.set(shin - Math.abs(ankles) * 0.16, 0, -ankles * 0.17);
      this.body.position.set(0, this.seatY + 0.1 * b - 0.66 * h + bob + 0.66 * h * (1 - Math.cos(rc)), 0.04 + 0.66 * h * Math.sin(rc));
      lean -= rc;
      headNod += rc * 0.55;
      if (this.skirt) this.skirt.scale.y = 0.5;
    } else {
      // the weight on one leg: the body tips over it, the legs stay upright and the other knee bends a little
      this.legL.rotation.set(legA, 0, -hip);
      this.legR.rotation.set(-legA, 0, -hip);
      this.shinL.rotation.set(kneeL + Math.max(0, -hip) * 4, 0, 0);
      this.shinR.rotation.set(kneeR + Math.max(0, hip) * 4, 0, 0);
      this.body.position.set(side, bob, 0);
      if (this.skirt) this.skirt.scale.y = 1;
    }
    // a hop: the body up (the shadow stays on the ground, smaller), the legs tucked, the arms out, a squash on landing
    if (this.lift > 0 || this.tuck > 0 || this.squash !== 0 || this.hopShown) {
      const k = this.tuck;
      if (!seated) {
        this.body.position.y += this.lift;
        this.legL.rotation.x += (-0.55 - this.legL.rotation.x) * k;
        this.legR.rotation.x += (-0.35 - this.legR.rotation.x) * k;
        this.shinL.rotation.x += (1.1 - this.shinL.rotation.x) * k;
        this.shinR.rotation.x += (0.8 - this.shinR.rotation.x) * k;
        lx += (-0.5 - lx) * k; rx += (-0.5 - rx) * k;
        lf += (-0.5 - lf) * k; rf += (-0.5 - rf) * k;
        lz -= 0.55 * k; rz += 0.55 * k;
      }
      const q = this.squash * 0.2;
      this.body.scale.set(1 + q * 0.5, 1 - q, 1 + q * 0.5);
      this.blob.scale.setScalar(0.95 * b * (1 - 0.45 * Math.min(1, this.lift / 0.6)));
      this.hopShown = this.lift > 0 || this.tuck > 0 || this.squash !== 0;
    }
    this.armL.rotation.set(lx, 0, lz);
    this.armR.rotation.set(rx, 0, rz);
    this.foreL.rotation.set(lf, lfy, lfz);
    this.foreR.rotation.set(rf, rfy, rfz);
    this.armL.position.y = this.armR.position.y = 1.2 * h + breath * 0.004 + shrug * 0.03;
    this.body.rotation.x = lean;
    this.body.rotation.z = this.bank + hip;
    this.head.rotation.x = headNod;
    this.head.rotation.y = headTurn;
    this.head.rotation.z = tilt;
    // blinking: the lids shut and open again in a fifth of a second (a curved line while they are shut), now and then
    // twice; more often while talking
    this.blinkT -= dt;
    let eye = 1;
    if (this.blinkT < BLINK) {
      const p = 1 - Math.max(0, this.blinkT) / BLINK;
      eye = p < 0.32 ? 1 - p / 0.32 : p < 0.55 ? 0 : (p - 0.55) / 0.45;
    }
    const shut = eye < 0.1 || happyEyes;
    this.eyes.scale.y = shut ? 1e-4 : (0.12 + 0.88 * eye) * f.eye;
    vis(this.lids, shut);
    if (this.blinkT < 0) this.blinkT = Math.random() < 0.15 ? 0.36 : (2.2 + Math.random() * 4) * (speaking ? 0.75 : 1);
  }

  /** A phrase starts: perhaps a gesture for it (the lively gesture more; fewer while sitting or with busy hands), and
   *  now and then a look aside, as people do when they think of what to say. */
  private phrase(seated: boolean) {
    const gs = this.gesture, r = Math.random();
    if (r < 0.22) { this.avertT = 0.3 + Math.random() * 0.4; this.avertX = (Math.random() < 0.5 ? -1 : 1) * 0.008; }
    // (one under way carries on through the next phrase)
    if (gs.w > 0.15) { if (Math.random() < 0.6) { gs.t = 0; gs.dur = 1.2 + Math.random() * 2; } return; }
    if (Math.random() > (0.4 + this.energy * 0.45) * (seated || this.busy ? 0.6 : 1)) { gs.kind = "rest"; return; }
    const mood = this.moodNow?.kind ?? this.mood, q = Math.random();
    const kinds: Gesture[] = mood === "concerned" ? ["chest", "both", "shrug", "palm"] : mood === "surprised" ? ["both", "shrug", "palm", "chest"]
      : ["palm", "explain", "both", "palm", "chest", "explain"];
    gs.kind = kinds[Math.floor(q * kinds.length)];
    if (seated && (gs.kind === "shrug" || gs.kind === "chest")) gs.kind = "palm";
    gs.side = Math.random() < 0.65 ? 1 : -1;
    gs.t = 0;
    gs.dur = 1.4 + Math.random() * 2.4;
  }

  /** The little thing under way, if any: one at a time, a few seconds each, a pause between. It eases in and out, and
   *  ends early (easing out) when the player comes close, a conversation starts or they start talking. */
  private fidget(dt: number, seated: boolean) {
    const calm = this.fidgets && !this.attentive && this.talking <= 0 && !this.reaction && (seated || this.anim === "idle");
    let m = this.moment;
    if (!m) {
      if (!calm || (this.momentT -= dt) > 0) return null;
      const kind = this.nextMoment(seated), [a, z] = MOMENT_SECONDS[kind];
      m = this.moment = { kind, t: 0, dur: a + Math.random() * (z - a), s: Math.random() < 0.5 ? -1 : 1, w: 0 };
    }
    m.t += dt;
    const ending = !calm || m.t > m.dur - 0.4;
    m.w = THREE.MathUtils.clamp(m.w + (ending ? -dt : dt) / 0.4, 0, 1);
    if (ending && m.w === 0) {
      this.moment = null;
      // people at work keep busier
      this.momentT = (this.busy === "wipe" || this.busy === "type" ? 1.5 : 2.5) + Math.random() * 4;
      return null;
    }
    return m;
  }

  private nextMoment(seated: boolean): Moment {
    const r = Math.random(), busy = this.busy;
    if (seated) {
      if (busy === "cup") return r < 0.4 ? "sip" : r < 0.75 ? "glance" : r < 0.88 ? "lean" : "ankles";
      if (busy === "type") return r < 0.6 ? "type" : "glance";
      if (busy === "paper") return r < 0.7 ? "glance" : "ankles";
      if (this.phone && r < 0.2) return "phone";
      return r < 0.45 ? "glance" : r < 0.62 ? "lean" : r < 0.82 ? "back" : "ankles";
    }
    if (busy === "wipe" || busy === "type") return r < 0.55 ? busy : r < 0.8 ? "glance" : "shift";
    if (this.holds === "coffee" && r < 0.3) return "sip";
    if (this.phone && r < 0.22) return "phone";
    if (this.holds) return r < 0.6 ? "glance" : r < 0.85 ? "shift" : "neck";
    return r < 0.36 ? "glance" : r < 0.56 ? "shift" : r < 0.68 ? "scratch" : r < 0.82 ? "hips" : r < 0.92 ? "watch" : "neck";
  }

  /** Dev (the lineup page): one of the little things, held at its full extent. */
  holdMoment(kind: Moment) { this.moment = { kind, t: 0, dur: 1e9, s: 1, w: 1 }; }
  /** Dev (the lineup page): a talking gesture held at its full extent (while talking). */
  holdGesture(kind: string, side: 1 | -1 = 1) { this.gesture = { kind: kind as Gesture, side, w: 1, t: 0, dur: 1e9 }; }

  /** Talk for `seconds`; `level` (optional) tells how loud the voice is right now, for the mouth (-1: it has ended),
   *  and `vowel` how round the sound is (0 wide … 1 round), for its shape. */
  talk(seconds: number, level?: () => number | null, vowel?: () => number | null) {
    if (this.talking <= 0) this.phrase(this.anim === "sit");
    this.talking = Math.max(this.talking, seconds);
    this.level = level ?? null;
    this.vowel = vowel ?? null;
  }

  /** Show an expression for `seconds` (then the person's own again, `mood`). */
  express(kind: Mood, seconds = 4) { this.moodNow = { kind, t: seconds }; }

  /** React to the learner's answer: a nod when understood, a puzzled look when not; applause when the task is done
   *  (after a nod under way). */
  react(kind: "nod" | "puzzled" | "clap") {
    if (kind === "clap" && this.reaction?.kind === "nod") { this.clapNext = true; return; }
    this.reaction = { kind, t: 0 };
  }

  /** Frees the GPU memory only this character uses: its baked mesh and its parts' geometries (built per character;
   *  NPCs are rebuilt on every zone change), and the skeleton's bone texture. The material is shared. */
  dispose() {
    this.farSkin?.geometry.dispose();
    this.skin?.geometry.dispose();
    this.skin?.skeleton.dispose();
    for (const p of this.parts) p.geo?.dispose();
  }
}
