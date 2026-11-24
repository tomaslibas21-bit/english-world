// Maple Harbor in the fall (graphics round of 16 Nov 2026, docs/MAPLE.md): what makes it a New England harbor town in
// October and not a tidy model of one. Leaves under the maples and in the air, bunting over Main Street, flower
// baskets and the town's banner on the lamp posts, barrels of mums, pumpkins at the doors and hay bales at the market,
// a lobster-roll truck in the square, the lighthouse with its gallery and lantern, lobster boats, stacked traps,
// buoys and an upturned dinghy at the pier, lobster buoys out in the bay, chairs and beach grass on the sand.
// Everything still goes into the town's baked meshes (util.ts `Merger.build`), so all of it costs a handful of draw
// calls: the leaves on the ground (1), the leaves in the air (1), the bunting (1), Main Street's brick (1), the buoys
// (1), two boats (2) and the truck's sign (1). The trial styles keep the pumpkins, truck and fishing boats for the photo walk.
import type { AddPhotoSpot } from "../../content/townQuests";
import * as THREE from "three";
import { markTownBoat } from "./boatRide";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BUILDINGS, FOUNTAIN, LIGHTHOUSE, STALLS, BEACH_Z } from "./layout";
import { Merger, mat, boxGeo, cylGeo, textTexture, rand, Colliders, colourMerge } from "./util";
import { STYLED } from "../style";
import { LIGHTHOUSE_ISLAND } from "./island";
import { addLighthouse } from "./lighthouseTower";
import { addHarborSurf } from "./harborSurf";
import { SURF_SPOT } from "./surf";

export interface MapleCtx {
  M: Merger; col: Colliders; group: THREE.Group;
  /** The street lamps: where, and whether their street runs east–west. */
  lamps: [number, number, boolean][];
  /** The trees: where, how big, and the crown's colour. */
  trees: { x: number; z: number; s: number; color: string }[];
  /** The town's clock for the shaders that move (town.ts `wind`). */
  wind: { value: number };
  photo: AddPhotoSpot;
}

/** The maples' colours in October: reds, oranges and golds, and one that has not turned yet. */
export const FALL = ["#d9542b", "#e8833a", "#f2b440", "#c8402f", "#e9a23b", "#b5382c", "#e0692c", "#9bb04a"];
const MUMS = ["#e8833a", "#f2b440", "#b5382c", "#f6ecd9", "#c85a8a"];
const PENNANTS = ["#c8392f", "#f6ecd9", "#e8833a", "#2f6b4f", "#f2b440"];

type Add = (g: THREE.BufferGeometry, color: string, o?: { flat?: boolean; emissive?: string; cast?: boolean }) => void;

/** A maple leaf lying in the x–y plane, a metre from stem to tip (banners, the leaves in the air). */
export function leafShape() {
  const half: [number, number][] = [[0.03, -0.5], [0.04, -0.3], [0.3, -0.38], [0.24, -0.18], [0.52, -0.06], [0.4, 0.05], [0.48, 0.28], [0.27, 0.2], [0.2, 0.4], [0.09, 0.3], [0, 0.56]];
  const s = new THREE.Shape();
  half.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  for (let i = half.length - 2; i >= 0; i--) s.lineTo(-half[i][0], half[i][1]);
  return new THREE.ShapeGeometry(s);
}

/** A pumpkin with its stem, sitting on the ground at (x, y, z). */
function pumpkin(add: Add, x: number, y: number, z: number, r: number, k = 0) {
  add(new THREE.SphereGeometry(r, 6, 4).scale(1, 0.76, 1).translate(x, y + r * 0.74, z), ["#e8833a", "#d9692b", "#f09a3e", "#f1e3c2"][k % 4], { flat: true });
  add(boxGeo(r * 0.22, r * 0.4, r * 0.22, x, y + r * 1.6, z), "#5d7a3a");
}
/** A hay bale (a metre long, along x before turning by `rot`). */
function bale(add: Add, x: number, y: number, z: number, rot: number) {
  add(boxGeo(1.0, 0.5, 0.55, 0, 0.25, 0).rotateY(rot).translate(x, y, z), "#d9b96a", { flat: true });
  for (const u of [-0.28, 0.28]) add(boxGeo(0.04, 0.52, 0.57, u, 0.25, 0).rotateY(rot).translate(x, y, z), "#b08f45");
}
/** A clump of mums: a green mound with blooms on it, `r` across, its foot at y. */
export function mums(add: Add, x: number, y: number, z: number, r: number, k: number) {
  add(new THREE.IcosahedronGeometry(r, 0).scale(1, 0.62, 1).translate(x, y + r * 0.45, z), "#4f8f3f", { flat: true });
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + k;
    add(new THREE.OctahedronGeometry(r * 0.42, 0).translate(x + Math.cos(a) * r * 0.5, y + r * 0.8 + (i % 2) * r * 0.12, z + Math.sin(a) * r * 0.5), MUMS[(k + i) % MUMS.length], { flat: true });
  }
}
/** A lobster trap: a wire cage on wooden runners, 0.95 m long (along x before turning), its foot at y. */
function trap(add: Add, x: number, y: number, z: number, rot: number, c: string) {
  const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, y, z);
  add(P(boxGeo(0.92, 0.38, 0.52, 0, 0.23, 0)), c);
  for (const u of [-0.45, 0, 0.45]) add(P(boxGeo(0.05, 0.43, 0.57, u, 0.225, 0)), "#3d4a44");
  add(P(boxGeo(0.96, 0.04, 0.56, 0, 0.02, 0)), "#8a6a48");
}
/** A lobster buoy: a painted float with a band and its stick, standing on y. */
export function buoy(parts: [THREE.BufferGeometry, THREE.ColorRepresentation][], x: number, y: number, z: number, a: string, b: string, lean = 0) {
  const P = (g: THREE.BufferGeometry) => g.rotateZ(lean).translate(x, y, z);
  parts.push([P(new THREE.CylinderGeometry(0.11, 0.07, 0.34, 6).translate(0, 0.17, 0)), a]);
  parts.push([P(new THREE.CylinderGeometry(0.115, 0.115, 0.08, 6).translate(0, 0.27, 0)), b]);
  parts.push([P(new THREE.CylinderGeometry(0.015, 0.015, 0.34, 4).translate(0, 0.5, 0)), "#e9e2d2"]);
}

/** A lobster boat (its bow towards +z): a high-bowed hull, the wheelhouse forward with its roof running aft, an open
 *  deck with traps and buoys, a hauler. One mesh that rocks on the water like the other boats (town.ts update). */
function lobsterBoat(hullC: string, trimC: string, material: THREE.Material, x: number, z: number, rot: number, phase: number, id: string) {
  const shape = new THREE.Shape();
  shape.moveTo(-1.25, -3.5); shape.lineTo(1.25, -3.5); shape.lineTo(1.3, 1.2); shape.quadraticCurveTo(1.15, 2.8, 0, 3.9);
  shape.quadraticCurveTo(-1.15, 2.8, -1.3, 1.2); shape.lineTo(-1.25, -3.5);
  const ex = (depth: number, y: number, sx = 1, sz = 1) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 5 }).rotateX(Math.PI / 2).scale(sx, 1, sz).translate(0, y + depth, 0);
  // the raised bow: the forward third of the hull's plan, a step higher
  const bow = new THREE.Shape();
  bow.moveTo(-1.3, 1.0); bow.lineTo(1.3, 1.0); bow.quadraticCurveTo(1.15, 2.8, 0, 3.9); bow.quadraticCurveTo(-1.15, 2.8, -1.3, 1.0);
  const bowG = new THREE.ExtrudeGeometry(bow, { depth: 0.34, bevelEnabled: false, curveSegments: 5 }).rotateX(Math.PI / 2).translate(0, 0.96, 0);
  const hull = ex(1.0, -0.38);
  const parts: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [
    [hull, hullC], [ex(0.1, 0.52, 1.02, 1.01), trimC], [ex(0.05, 0.6, 0.9, 0.93), "#b9a383"], [bowG, hullC],
    [new THREE.ExtrudeGeometry(bow, { depth: 0.06, bevelEnabled: false, curveSegments: 5 }).rotateX(Math.PI / 2).scale(1.02, 1, 1.01).translate(0, 1.02, 0), trimC],
    // the wheelhouse, its windows, and the roof that shelters the helm
    [new THREE.BoxGeometry(1.7, 1.5, 1.7).translate(0, 1.4, 1.3), "#f4f1ea"],
    [new THREE.BoxGeometry(1.72, 0.5, 1.5).translate(0, 1.72, 1.35), "#4f7f9c"],
    [new THREE.BoxGeometry(1.4, 0.5, 0.06).translate(0, 1.72, 2.17), "#4f7f9c"],
    [new THREE.BoxGeometry(2.0, 0.09, 2.9).translate(0, 2.2, 0.75), trimC],
    [new THREE.BoxGeometry(0.07, 1.5, 0.07).translate(-0.9, 1.4, -0.6), "#f4f1ea"], [new THREE.BoxGeometry(0.07, 1.5, 0.07).translate(0.9, 1.4, -0.6), "#f4f1ea"],
    // a mast with the radar's bar and an antenna
    [new THREE.CylinderGeometry(0.04, 0.04, 1.1, 5).translate(0, 2.8, 1.2), "#d9d9d9"], [new THREE.BoxGeometry(0.7, 0.07, 0.12).translate(0, 2.9, 1.2), "#f4f1ea"],
    [new THREE.CylinderGeometry(0.012, 0.012, 1.6, 4).translate(0.5, 3.0, 1.9), "#d9d9d9"],
    [new THREE.BoxGeometry(0.66, 0.3, 0.36).translate(-0.42, 0.8, -1.43), "#9f8769"],
    // the hauler on the starboard rail, a coil of rope, a fish crate
    [new THREE.CylinderGeometry(0.05, 0.05, 1.3, 5).translate(1.15, 1.3, -0.3), "#8a939b"], [new THREE.BoxGeometry(0.5, 0.06, 0.06).translate(1.37, 1.92, -0.3), "#8a939b"],
    [new THREE.CylinderGeometry(0.14, 0.14, 0.06, 8).rotateZ(Math.PI / 2).translate(1.6, 1.9, -0.3), "#3a3d42"],
    [new THREE.TorusGeometry(0.26, 0.07, 4, 8).rotateX(Math.PI / 2).translate(-0.7, 0.72, -0.5), "#d9c9a0"],
    [new THREE.BoxGeometry(0.6, 0.3, 0.42).translate(0.6, 0.8, -1.0), "#4a7bb7"],
  ];
  const add: Add = (g, c) => { parts.push([g, c]); };
  // traps stacked aft, two rows and one on top; buoys along the stern
  for (const [tx, ty, tz, c] of [[-0.5, 0.65, -2.7, "#d9b23a"], [0.5, 0.65, -2.7, "#3f7d5c"], [-0.5, 0.65, -2.05, "#3f7d5c"], [0.5, 0.65, -2.05, "#d9b23a"], [0, 1.08, -2.4, "#d9b23a"]] as [number, number, number, string][]) trap(add, tx, ty, tz, 0, c);
  buoy(parts, -1.0, 0.65, -3.2, "#e45b4f", "#ffffff", 0.5); buoy(parts, -0.7, 0.65, -3.25, "#f2c14e", "#2f6db5", -0.4); buoy(parts, 1.0, 0.65, -3.2, "#e45b4f", "#ffffff", -0.5);
  const mesh = new THREE.Mesh(colourMerge(parts), material);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = rot;
  mesh.castShadow = true;
  mesh.name = "lobster-boat";
  mesh.userData.boat = { phase, rot };
  markTownBoat(mesh, hull, id, hullC, 0.65, [-0.42, -1.35]);
  return mesh;
}

export function makeLobsterBoats(boatMat: THREE.Material) {
  return [
    lobsterBoat("#f4f1ea", "#b5382c", boatMat, -43.6, -80.5, Math.PI, 2.3, "lobster-1"),
    lobsterBoat("#2f6b4f", "#f6ecd9", boatMat, 76, -92, 2.0, 4.1, "lobster-2"),
  ];
}

/** Builds the fall decor into the town (before its Merger is built). Returns what moves it each frame. */
export function addMapleDecor(c: MapleCtx): (t: number, dt: number) => void {
  const { M, col, group, photo } = c;
  const add: Add = (g, color, o = {}) => M.add("mh-" + color + (o.flat ? "f" : "") + (o.emissive ?? ""), mat(color, { flat: o.flat || undefined, emissive: o.emissive }), g, o.cast ?? true);
  addHarborSurf(c, add);
  const placePumpkin = (x: number, y: number, z: number, scale: number, seed: number) => {
    pumpkin(add, x, y, z, scale, seed);
    photo("pumpkin", x, y + scale * 0.7, z);
  };
  const addBoats = () => {
    const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const boats = makeLobsterBoats(material);
    for (const boat of boats) photo("boat", boat.position.x, 1.2, boat.position.z, boat.position);
    group.add(...boats);
  };
  if (STYLED) {
    addDoorPumpkins(placePumpkin);
    addLobsterTruck(add, col, group, photo, placePumpkin);
    addBoats();
    return () => {};
  }
  const updates: ((t: number, dt: number) => void)[] = [];
  const r = rand(1016);

  // --- under the maples: fallen leaves, thick near the trunk and thinning out (one mesh of small flat diamonds) ---
  {
    const pos: number[] = [], colr: number[] = [], k = new THREE.Color(), lr = rand(77);
    const leaf = (x: number, z: number, size: number, hex: string) => {
      if (z < BEACH_Z - 5.5 || Math.hypot(x - 108, z + 36) < 9.6) return; // not in the sea's wash, not on the pond
      const a = lr() * Math.PI, y = 0.022 + lr() * 0.012, w = size * 0.5, l = size;
      const cs = Math.cos(a), sn = Math.sin(a);
      const P = (u: number, v: number) => [x + u * cs - v * sn, y, z + u * sn + v * cs];
      const q = [P(-l, 0), P(0, w), P(l, 0), P(0, -w)];
      for (const i of [0, 1, 2, 0, 2, 3]) pos.push(...q[i]);
      k.set(hex).offsetHSL((lr() - 0.5) * 0.03, -0.08, (lr() - 0.5) * 0.12 - 0.03);
      for (let i = 0; i < 6; i++) colr.push(k.r, k.g, k.b);
    };
    for (const t of c.trees) {
      const n = Math.round((30 + lr() * 14) * t.s);
      for (let i = 0; i < n; i++) {
        const a = lr() * Math.PI * 2, d = (0.3 + Math.pow(lr(), 1.5) * 4.2) * t.s;
        leaf(t.x + Math.cos(a) * d, t.z + Math.sin(a) * d, 0.09 + lr() * 0.07, lr() < 0.72 ? t.color : FALL[Math.floor(lr() * 7)]);
      }
    }
    // and some the wind took along Main Street's sidewalks and gutters
    for (let i = 0; i < 420; i++) leaf(-100 + lr() * 224, lr() < 0.5 ? -13.2 - Math.pow(lr(), 2) * 3.2 : -2.8 + Math.pow(lr(), 2) * 3.2, 0.08 + lr() * 0.06, FALL[Math.floor(lr() * 7)]);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colr, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    const litter = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    litter.name = "leaf-litter";
    litter.receiveShadow = true;
    litter.userData.thin = true;
    litter.matrixAutoUpdate = false;
    group.add(litter);
  }
  // raked piles in the park and on the lawns (soft: walked through)
  for (const [x, z, s, k] of [[88, -22, 1, 0], [112, -19, 0.8, 2], [96, -44, 1.1, 1], [-45, 48.5, 0.7, 3], [26, 47.6, 0.7, 0], [-62, -47, 0.8, 5]] as [number, number, number, number][]) {
    add(new THREE.IcosahedronGeometry(1.1 * s, 1).scale(1, 0.34, 0.9).translate(x, 0.12 * s, z), FALL[k], { flat: true });
    add(new THREE.IcosahedronGeometry(0.7 * s, 0).scale(1, 0.4, 1).translate(x + 0.5 * s, 0.2 * s, z - 0.3 * s), FALL[(k + 2) % 7], { flat: true });
  }

  // --- leaves coming down from the maples near the camera (one instanced mesh) ---
  {
    const N = 56;
    const geo = leafShape().scale(0.32, 0.32, 0.32);
    const fall = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), N);
    fall.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    fall.frustumCulled = false;
    fall.name = "falling-leaves";
    fall.userData.thin = true;
    const cam = new THREE.Vector3(1e6, 0, 0);
    let seen = false;
    fall.onBeforeRender = (_r, _s, camera) => { cam.copy(camera.position); seen = true; };
    const st = Array.from({ length: N }, (_, i) => ({ tree: -1, u: 1, period: 6.5 + (i % 7) * 0.55, phase: (i * 0.618) % 1, ox: 0, oz: 0, spin: 1 + (i % 5) * 0.4 }));
    const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const k = new THREE.Color();
    let near: number[] = [], nextScan = 0;
    for (let i = 0; i < N; i++) { fall.setMatrixAt(i, zero); fall.setColorAt(i, k.set(FALL[i % 7])); }
    updates.push((t) => {
      if (!seen) return;
      if (t >= nextScan) {
        nextScan = t + 0.8;
        near = [];
        c.trees.forEach((tr, i) => { if (Math.hypot(tr.x - cam.x, tr.z - cam.z) < 46) near.push(i); });
      }
      for (let i = 0; i < N; i++) {
        const s = st[i], u = (t / s.period + s.phase) % 1;
        if (u < s.u) {
          // a new leaf lets go, from a tree in view
          s.tree = near.length ? near[Math.floor(r() * near.length)] : -1;
          const a = r() * Math.PI * 2, d = 0.4 + r() * 1.3;
          s.ox = Math.cos(a) * d; s.oz = Math.sin(a) * d;
          if (s.tree >= 0) fall.setColorAt(i, k.set(c.trees[s.tree].color));
        }
        s.u = u;
        if (s.tree < 0) { fall.setMatrixAt(i, zero); continue; }
        const tr = c.trees[s.tree], top = 3.4 * tr.s, fl = Math.min(1, u / 0.86);
        p.set(tr.x + s.ox * tr.s + fl * 1.6 + Math.sin(t * 1.3 + i) * 0.45 * fl, Math.max(0.05, top * (1 - fl)), tr.z + s.oz * tr.s + fl * 0.5 + Math.cos(t * 1.1 + i * 2.1) * 0.4 * fl);
        if (fl < 1) e.set(t * s.spin + i, t * 0.7 * s.spin, Math.sin(t * 2 + i) * 0.8); else e.set(-Math.PI / 2, 0, i);
        sc.setScalar(u > 0.93 ? (1 - u) / 0.07 : Math.min(1, u * 12));
        fall.setMatrixAt(i, m4.compose(p, q.setFromEuler(e), sc));
      }
      fall.instanceMatrix.needsUpdate = true;
      if (fall.instanceColor) fall.instanceColor.needsUpdate = true;
    });
    group.add(fall);
  }

  // --- Main Street's sidewalks in brick, between the crossings (one textured mesh laid over the ground) ---
  {
    const S = 256, cv = document.createElement("canvas");
    cv.width = cv.height = S;
    const g2 = cv.getContext("2d")!, br = rand(88);
    g2.fillStyle = "#a89684"; g2.fillRect(0, 0, S, S); // the joints
    const tones = ["#b9664c", "#ad5c45", "#c27458", "#b56a52", "#a65843", "#c07a5f"];
    for (let row = 0; row < 8; row++) for (let i = -1; i < 4; i++) {
      g2.fillStyle = tones[Math.floor(br() * tones.length)];
      g2.fillRect(i * 64 + (row % 2) * 32 + 1.5, row * 32 + 1.5, 61, 29);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    const strips: THREE.BufferGeometry[] = [];
    for (const [x0, x1] of [[-104, -74], [-66, -4.5], [4.5, 66], [74, 126]]) for (const [z0, z1] of [[-16.2, -13.14], [-2.86, 0.2]]) {
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0.008, (z0 + z1) / 2);
      const uv = g.attributes.uv, pp = g.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, pp.getX(i) / 1.6, pp.getZ(i) / 1.6);
      strips.push(g);
    }
    const walk = new THREE.Mesh(mergeGeometries(strips, false)!, new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    walk.name = "brick-walk";
    walk.receiveShadow = true;
    walk.matrixAutoUpdate = false;
    group.add(walk);
  }

  // --- the lamp posts: two hanging baskets of mums on each ---
  const leafG = leafShape();
  c.lamps.forEach(([x, z, horiz], i) => {
    const ax = horiz ? 1 : 0, az = horiz ? 0 : 1;
    add(boxGeo(horiz ? 1.3 : 0.05, 0.05, horiz ? 0.05 : 1.3, x, 3.72, z), "#2f3a40", { cast: false });
    for (const s of [-1, 1]) {
      const bx = x + ax * s * 0.6, bz = z + az * s * 0.6;
      add(cylGeo(0.008, 0.008, 0.34, bx, 3.55, bz, 3), "#2f3a40", { cast: false });
      add(new THREE.ConeGeometry(0.25, 0.26, 6).rotateX(Math.PI).translate(bx, 3.26, bz), "#6b4a34", { flat: true });
      add(new THREE.IcosahedronGeometry(0.27, 0).scale(1, 0.6, 1).translate(bx, 3.44, bz), "#4f8f3f", { flat: true });
      for (let k = 0; k < 3; k++) add(new THREE.OctahedronGeometry(0.12, 0).translate(bx + Math.cos(k * 2.1 + i) * 0.14, 3.56, bz + Math.sin(k * 2.1 + i) * 0.14), MUMS[(i + k + (s > 0 ? 2 : 0)) % MUMS.length], { flat: true, cast: false });
    }
  });

  // --- bunting over Main Street: slim poles along both curbs, the strings zigzag across the street from one to the
  // next (one mesh that flutters); each pole carries the town's banner and has a half-barrel of mums at its foot ---
  {
    // each block's poles from west to east, north and south curb in turn (clear of the doors and the crossings)
    const BLOCKS: [number, boolean][][] = [
      [[-98, true], [-82, false]],
      [[-61, true], [-48, false], [-35, true], [-19, false], [-9.5, true]],
      [[9.5, false], [22, true], [37, false], [49, true], [61, false]],
      [[80, true], [93, false], [105, true], [116, false]],
    ];
    const strings: [number[], number[]][] = [];
    let pi = 0;
    for (const block of BLOCKS) {
      const pts = block.map(([x0, north]) => {
        let x = x0;
        const z = north ? -15.6 : -0.4;
        for (let i = 0; i < 6 && col.blocked(x, z, 0.5); i++) x += 1.2;
        const i = pi++, out = north ? 1 : -1;
        add(cylGeo(0.06, 0.09, 4.5, x, 2.25, z, 6), "#2f3a40");
        add(new THREE.SphereGeometry(0.12, 6, 4).translate(x, 4.56, z), "#c9a227", { cast: false });
        col.addCircle(x, z, 0.14);
        // the banner hangs on the street's side of the pole: harbor blue or pine green cloth, a golden or orange maple
        // leaf on both faces (never a red leaf on white: that is another country's flag)
        add(boxGeo(0.04, 0.04, 0.62, x, 3.5, z + out * 0.33), "#2f3a40", { cast: false });
        add(boxGeo(0.03, 1.15, 0.5, x, 2.9, z + out * 0.38), i % 2 ? "#1d4e6b" : "#2f6b4f");
        for (const s of [-1, 1]) add(leafG.clone().scale(0.36, 0.36, 0.36).rotateY(s * Math.PI / 2).translate(x + s * 0.02, 2.94, z + out * 0.38), i % 2 ? "#f09a3e" : "#f2b440", { cast: false });
        // and the barrel stands by it, along the curb
        const bx = x + (i % 2 ? 0.8 : -0.8);
        if (!col.blocked(bx, z, 0.45)) {
          add(cylGeo(0.36, 0.3, 0.5, bx, 0.25, z, 10), "#8a5a3c");
          for (const y of [0.12, 0.4]) add(cylGeo(0.37, 0.37, 0.05, bx, y, z, 10), "#3d4a44", { cast: false });
          mums(add, bx, 0.44, z, 0.42, i);
          col.addCircle(bx, z, 0.38);
        }
        return [x, z];
      });
      for (let i = 0; i + 1 < pts.length; i++) strings.push([pts[i], pts[i + 1]]);
    }
    const pos: number[] = [], colr: number[] = [], sway: number[] = [], k = new THREE.Color();
    const tri = (a: number[], b: number[], cc: number[], hex: string, sw: number[][]) => {
      pos.push(...a, ...b, ...cc);
      k.set(hex);
      for (let i = 0; i < 3; i++) { colr.push(k.r, k.g, k.b); sway.push(...sw[i]); }
    };
    let n = 0;
    for (const [a, b] of strings) {
      const H = 4.42, SAG = 0.7, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len, nx = -dz, nz = dx;
      const pt = (u: number) => [a[0] + (b[0] - a[0]) * u, H - 4 * SAG * u * (1 - u), a[1] + (b[1] - a[1]) * u];
      const SEG = 22, none = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (let s = 0; s < SEG; s++) {
        const p0 = pt(s / SEG), p1 = pt((s + 1) / SEG);
        tri(p0, p1, [p1[0], p1[1] - 0.035, p1[2]], "#3a3d42", none);
        tri(p0, [p1[0], p1[1] - 0.035, p1[2]], [p0[0], p0[1] - 0.035, p0[2]], "#3a3d42", none);
      }
      const count = Math.floor((len - 1.6) / 0.66);
      for (let j = 0; j < count; j++) {
        const u = (0.8 + j * 0.66 + 0.33) / len, p = pt(u);
        tri([p[0] - dx * 0.24, p[1] - 0.02, p[2] - dz * 0.24], [p[0] + dx * 0.24, p[1] - 0.02, p[2] + dz * 0.24], [p[0], p[1] - 0.62, p[2]], PENNANTS[n++ % PENNANTS.length], [[0, 0, 0], [0, 0, 0], [nx, 0, nz]]);
      }
    }
    if (pos.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(colr, 3));
      g.setAttribute("sway", new THREE.Float32BufferAttribute(sway, 3));
      g.computeVertexNormals();
      const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uWind = c.wind;
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWind;\nattribute vec3 sway;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += sway * sin(uWind * 3.3 + position.x * 1.7 + position.z * 2.3) * 0.17;");
      };
      const mesh = new THREE.Mesh(g, m);
      mesh.name = "bunting";
      mesh.castShadow = true;
      mesh.userData.thin = true; // looked through and never stood on (the camera's field and the ledges leave it out)
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
    }
  }

  addDoorPumpkins(placePumpkin);
  addSquare(add, col, placePumpkin);
  addLobsterTruck(add, col, group, photo, placePumpkin);
  addBoats();
  if (!LIGHTHOUSE_ISLAND) addLighthouse(add, LIGHTHOUSE);
  addHarborGear(add, col, group, updates);
  addBeach(add, col);
  return (t, dt) => { for (const u of updates) u(t, dt); };
}

type PlacePumpkin = (x: number, y: number, z: number, scale: number, seed: number) => void;

function addDoorPumpkins(placePumpkin: PlacePumpkin) {
  // --- pumpkins by the doors on Main Street and in front of the houses ---
  for (const b of BUILDINGS) {
    const n = ({ n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] } as Record<string, [number, number]>)[b.face], t: [number, number] = [-n[1], n[0]];
    const hd = b.face === "n" || b.face === "s" ? b.d / 2 : b.w / 2, off = b.doorOffset ?? 0;
    const house = b.style === "house";
    if (!house && !(b.style === "shop" || b.style === "restaurant" || b.id === "visitor" || b.id === "post")) continue;
    const dw = (b.doorWidth ?? 1.8) / 2 + (house ? 1.5 : 0.75), out = hd + (house ? 2.7 : 0.42);
    const s = (b.x + b.z) % 2 > 0 ? 1 : -1, px = b.x + n[0] * out + t[0] * (off + s * dw), pz = b.z + n[1] * out + t[1] * (off + s * dw);
    placePumpkin(px, 0, pz, 0.26, Math.abs(Math.round(b.x)));
    placePumpkin(px + t[0] * s * 0.42 + n[0] * 0.1, 0, pz + t[1] * s * 0.42 + n[1] * 0.1, 0.17, Math.abs(Math.round(b.x)) + 1);
    if (house) placePumpkin(px - t[0] * s * 0.4 + n[0] * 0.25, 0, pz - t[1] * s * 0.4 + n[1] * 0.25, 0.2, Math.abs(Math.round(b.x)) + 3);
  }
}

/** The square in October: planters of mums round the fountain, hay bales, pumpkins and corn stalks at the farmers'
 *  market. */
function addSquare(add: Add, col: Colliders, placePumpkin: PlacePumpkin) {
  const { x: fx, z: fz } = FOUNTAIN;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = fx + sx * 5.6, z = fz + sz * 5.6;
    add(boxGeo(1.0, 0.5, 1.0, x, 0.25, z), "#8a5a3c");
    add(boxGeo(1.08, 0.07, 1.08, x, 0.5, z), "#6b4a34", { cast: false });
    mums(add, x - 0.18, 0.46, z - 0.12, 0.44, sx + 2); mums(add, x + 0.22, 0.46, z + 0.2, 0.36, sz + 3);
    col.addBox(x, z, 1.05, 1.05);
  }
  // between the stalls (behind the line the shoppers walk): bales with pumpkins on and around them, corn stalks
  for (const [x, z, k] of [[20, -43.9, 0], [32, -44.1, 1]] as [number, number, number][]) {
    bale(add, x - 0.55, 0, z, 0.06); bale(add, x + 0.55, 0, z, -0.05); bale(add, x, 0.5, z, 0.2);
    placePumpkin(x - 0.7, 0.5, z, 0.22, k); placePumpkin(x + 0.75, 0.5, z + 0.05, 0.18, k + 1); placePumpkin(x, 1.0, z, 0.24, k + 2);
    placePumpkin(x - 1.35, 0, z + 0.5, 0.3, k + 1); placePumpkin(x + 1.4, 0, z + 0.45, 0.24, k); placePumpkin(x + 0.2, 0, z + 0.62, 0.2, k + 3);
    for (let i = 0; i < 5; i++) add(new THREE.ConeGeometry(0.1, 2.3, 4).translate(x - 1.5 + (i % 3) * 0.09, 1.15, z - 0.25 + i * 0.07), i % 2 ? "#c9a55a" : "#b8934a", { flat: true });
    add(boxGeo(0.34, 0.08, 0.34, x - 1.42, 0.9, z - 0.12), "#8a5a3c", { cast: false });
    col.addBox(x, z, 2.3, 0.8);
  }
  for (const s of STALLS) { placePumpkin(s.x - 2.35, 0, s.z + 0.55, 0.26, s.x); placePumpkin(s.x + 2.4, 0, s.z + 0.5, 0.2, s.x + 1); }
}

function addLobsterTruck(add: Add, col: Colliders, group: THREE.Group, photo: AddPhotoSpot, placePumpkin: PlacePumpkin) {
  // the truck: its cab to the north, the serving window on the east side under a striped awning
  const X = 11.4, Z = -31;
  photo("food_truck", X, 1.9, Z);
  const body = "#2a9d8f", cream = "#f6ecd9", dark = "#2b3338";
  add(boxGeo(2.4, 2.3, 4.5, X, 1.7, Z + 0.75), body);
  add(boxGeo(2.42, 0.34, 4.52, X, 0.95, Z + 0.75), cream, { cast: false });
  add(boxGeo(2.3, 1.45, 1.5, X, 1.28, Z - 2.25), body);
  add(boxGeo(2.1, 0.62, 0.06, X, 1.62, Z - 3.0), "#9ccbe6", { emissive: "#1b3a4c", cast: false });
  for (const s of [-1, 1]) add(boxGeo(0.06, 0.5, 0.8, X + s * 1.15, 1.62, Z - 2.4), "#9ccbe6", { emissive: "#1b3a4c", cast: false });
  add(boxGeo(2.34, 0.3, 0.2, X, 0.62, Z - 3.02), "#c9cfd4");
  for (const s of [-1, 1]) add(boxGeo(0.3, 0.16, 0.05, X + s * 0.85, 0.95, Z - 3.02), "#fff4c4", { emissive: "#a08a3a", cast: false });
  for (const [wx, wz] of [[-1.1, -2.2], [1.1, -2.2], [-1.1, 1.9], [1.1, 1.9]]) add(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10).rotateZ(Math.PI / 2).translate(X + wx, 0.42, Z + wz), "#22252a");
  add(boxGeo(2.44, 0.1, 4.56, X, 2.88, Z + 0.75), cream);
  add(boxGeo(0.7, 0.3, 0.7, X - 0.3, 3.06, Z + 2.1), "#c9cfd4"); // the roof vent
  // the window: a dark opening, its shelf, what stands on it
  add(boxGeo(0.06, 0.95, 2.7, X + 1.2, 2.0, Z + 0.8), dark, { cast: false });
  add(boxGeo(0.42, 0.06, 2.9, X + 1.38, 1.5, Z + 0.8), "#e9e2d2");
  for (const [dz, cc] of [[-0.9, "#c8392f"], [-0.72, "#f2c14e"], [0.2, "#f6ecd9"], [0.38, "#f6ecd9"]] as [number, string][]) add(cylGeo(0.05, 0.05, 0.2, X + 1.42, 1.63, Z + 0.8 + dz, 6), cc, { cast: false });
  add(boxGeo(0.2, 0.14, 0.3, X + 1.4, 1.6, Z + 1.75), "#8a939b", { cast: false });
  // the awning: five stripes sloping out over the window, on two struts
  for (let i = 0; i < 6; i++) add(boxGeo(1.25, 0.05, 0.5, 0.6, 0, 0).rotateZ(-0.32).translate(X + 1.2, 2.72, Z - 0.45 + i * 0.5), i % 2 ? cream : "#c8392f");
  for (const dz of [-0.65, 2.25]) add(boxGeo(1.2, 0.04, 0.04, 0.58, 0, 0).rotateZ(0.42).translate(X + 1.2, 1.86, Z + dz), "#c9cfd4", { cast: false });
  // a lobster on the roof, as such trucks have: body, tail, two claws held up, feelers
  const R = "#d6402f";
  add(new THREE.CapsuleGeometry(0.3, 0.8, 3, 8).rotateX(Math.PI / 2).translate(X, 3.28, Z + 0.5), R, { flat: true });
  for (let i = 0; i < 3; i++) add(boxGeo(0.5 - i * 0.08, 0.2 - i * 0.03, 0.3, X, 3.2 - i * 0.03, Z + 1.3 + i * 0.28), R);
  add(boxGeo(0.7, 0.06, 0.3, X, 3.1, Z + 2.12), R);
  for (const s of [-1, 1]) {
    add(boxGeo(0.12, 0.12, 0.7, 0, 0, -0.3).rotateY(-s * 0.5).rotateX(0.5).translate(X + s * 0.3, 3.4, Z - 0.1), R);
    add(new THREE.SphereGeometry(0.24, 6, 4).scale(0.8, 0.6, 1.3).translate(X + s * 0.68, 3.78, Z - 0.75), R, { flat: true });
    add(cylGeo(0.012, 0.012, 0.7, 0, 0.35, 0, 3).rotateX(-1.0).rotateY(-s * 0.3).translate(X + s * 0.1, 3.4, Z - 0.1), "#8a2a1f", { cast: false });
    for (let i = 0; i < 3; i++) add(boxGeo(0.36, 0.04, 0.05, s * 0.4, 0, 0).rotateZ(-s * 0.5).translate(X, 3.24, Z + 0.3 + i * 0.22), R, { cast: false });
  }
  col.addBox(X, Z, 2.7, 6.3);
  // its name over the window, towards the square
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.42), new THREE.MeshBasicMaterial({ map: textTexture("Harbor Lobster Rolls", { bg: "#fffaf0", fg: "#b5382c", w: 512, h: 74 }) }));
  // (a board standing on the roof's edge, clear of the awning below it)
  sign.position.set(X + 1.215, 3.16, Z + 0.8);
  sign.rotation.y = Math.PI / 2;
  group.add(sign);
  add(boxGeo(0.06, 0.5, 2.98, X + 1.18, 3.16, Z + 0.8), "#b5382c", { cast: false });
  // two standing tables, a menu board on its legs, a crate of pumpkins
  for (const [tx, tz] of [[15.9, -33.4], [16.2, -29.3]]) {
    add(cylGeo(0.42, 0.42, 0.05, tx, 1.06, tz, 12), cream); add(cylGeo(0.04, 0.04, 1.05, tx, 0.52, tz, 6), "#3a3d42"); add(cylGeo(0.26, 0.28, 0.04, tx, 0.02, tz, 10), "#3a3d42", { cast: false });
    add(cylGeo(0.035, 0.035, 0.16, tx + 0.12, 1.16, tz - 0.08, 6), "#c8392f", { cast: false }); add(cylGeo(0.035, 0.035, 0.16, tx + 0.02, 1.16, tz + 0.1, 6), "#f2c14e", { cast: false });
    add(boxGeo(0.14, 0.1, 0.12, tx - 0.14, 1.13, tz), "#e9e2d2", { cast: false });
    col.addCircle(tx, tz, 0.44);
  }
  for (const s of [-1, 1]) add(boxGeo(0.62, 1.0, 0.04, 0, 0.5, 0).rotateX(s * 0.2).translate(14.1, 0, -27.3 + s * 0.14), "#2f3a33");
  for (let i = 0; i < 4; i++) add(boxGeo(0.4 - (i % 2) * 0.1, 0.03, 0.01, 14.1, 0.78 - i * 0.14, -27.02 - i * 0.026), "#f6ecd9", { cast: false });
  col.addBox(14.1, -27.3, 0.7, 0.5);
  add(boxGeo(0.8, 0.4, 0.6, 12.4, 0.2, -27.2), "#9c6b43");
  placePumpkin(12.2, 0.4, -27.25, 0.2, 0); placePumpkin(12.62, 0.4, -27.15, 0.17, 2); placePumpkin(13.0, 0, -26.9, 0.24, 1);
  col.addBox(12.4, -27.2, 0.85, 0.65);
}

/** The working harbor at the foot of the pier: lobster boats, traps stacked on the sand, a rack of buoys, fish
 *  crates and rope, a dinghy turned over for the winter; and the lobstermen's buoys out in the bay. */
function addHarborGear(add: Add, col: Colliders, group: THREE.Group, updates: ((t: number, dt: number) => void)[]) {
  const boatMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

  const TRAPS = ["#d9b23a", "#3f7d5c", "#d9b23a", "#4a5a52"];
  // the big stack west of the walkway: three long, two deep, three high (stepped)
  {
    const x0 = -38.2, z0 = -68.9;
    let n = 0;
    for (let lvl = 0; lvl < 3; lvl++) for (let row = 0; row < 2; row++) for (let i = 0; i < 3 - lvl; i++) trap(add, x0 + (i - (2 - lvl) / 2) * 1.0, lvl * 0.43, z0 + (row - 0.5) * 0.62, 0, TRAPS[n++ % 4]);
    col.addBox(x0, z0, 3.1, 1.3);
    const parts: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
    buoy(parts, x0 - 1.9, 0, z0 + 0.3, "#e45b4f", "#ffffff", 0.9); buoy(parts, x0 + 1.95, 0, z0 - 0.2, "#f2c14e", "#2f6db5", -1.1); buoy(parts, x0 + 0.5, 1.29, z0, "#e45b4f", "#ffffff", 0.2);
    for (const [g, cc] of parts) add(g, cc as string);
    add(new THREE.TorusGeometry(0.32, 0.08, 4, 10).rotateX(Math.PI / 2).translate(x0 - 0.2, 0.08, z0 + 1.15), "#d9c9a0");
    add(new THREE.TorusGeometry(0.24, 0.08, 4, 10).rotateX(Math.PI / 2).translate(x0 - 0.2, 0.2, z0 + 1.15), "#d9c9a0");
  }
  // a smaller one east of it, with the day's crates
  {
    const x0 = -23.4, z0 = -68.6, rot = 0.22;
    trap(add, x0 - 0.5, 0, z0, rot, TRAPS[1]); trap(add, x0 + 0.5, 0, z0 + 0.22, rot, TRAPS[0]); trap(add, x0, 0.43, z0 + 0.1, rot, TRAPS[3]);
    col.addBox(x0, z0 + 0.1, 2.1, 0.9);
    for (const [cx, cy, cc] of [[0, 0, "#4a7bb7"], [0.03, 0.32, "#e45b4f"], [-0.02, 0.64, "#4a7bb7"]] as [number, number, string][]) add(boxGeo(0.72, 0.3, 0.5, x0 + 2.0 + cx, cy + 0.15, z0 - 0.5, 0.1), cc);
    col.addBox(x0 + 2.0, z0 - 0.5, 0.8, 0.6);
  }
  // the buoy rack: two posts, a beam, the buoys hanging by their sticks
  {
    const x0 = -42.6, z0 = -66.2;
    for (const s of [-1, 1]) add(cylGeo(0.07, 0.08, 2.0, x0 + s * 1.3, 1.0, z0, 6), "#7a5a3a");
    add(boxGeo(2.9, 0.1, 0.1, x0, 1.95, z0), "#7a5a3a");
    const parts: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
    const cols: [string, string][] = [["#e45b4f", "#ffffff"], ["#f2c14e", "#2f6db5"], ["#6fbf73", "#f2c14e"], ["#ffffff", "#e45b4f"], ["#4a7bb7", "#f6ecd9"], ["#f08a3c", "#2b3338"]];
    cols.forEach(([a, b], i) => {
      const g: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
      buoy(g, 0, 0, 0, a, b);
      for (const [gg, cc] of g) parts.push([gg.rotateX(Math.PI).translate(x0 - 1.0 + i * 0.4, 1.92 - (i % 2) * 0.12, z0), cc]);
    });
    for (const [g, cc] of parts) add(g, cc as string, { cast: false });
    col.addBox(x0, z0, 2.9, 0.3);
  }
  // the dinghy, keel up on two blocks
  {
    const x0 = -47.4, z0 = -69.2, rot = 0.5;
    const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x0, 0, z0);
    add(P(new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.72, 0.6, 1.7).translate(0, 0.16, 0)), "#3f6e8c", { flat: true });
    add(P(boxGeo(0.07, 0.1, 3.0, 0, 0.74, 0)), "#f6ecd9", { cast: false });
    add(P(boxGeo(1.5, 0.06, 3.44, 0, 0.17, 0)), "#f6ecd9", { cast: false });
    for (const dz of [-1.0, 1.0]) add(P(boxGeo(1.3, 0.16, 0.2, 0, 0.08, dz)), "#7a5a3a", { cast: false });
    col.addBox(x0, z0, 2.4, 3.0);
  }
  // nets drying over the pier's rail posts are left to the imagination; a pair of oars against the stack is not
  for (const s of [0, 1]) add(cylGeo(0.03, 0.03, 2.3, 0, 1.15, 0, 5).rotateZ(0.16).translate(-36.2 + s * 0.16, 0, -68.1 - s * 0.05), "#c9a27a", { cast: false });

  // out in the bay: the buoys over the traps, each lobsterman's in his colours (one mesh that rides the swell)
  const br = rand(511), parts: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
  const liveries: [string, string][] = [["#e45b4f", "#ffffff"], ["#f2c14e", "#2f6db5"], ["#6fbf73", "#f2c14e"], ["#ffffff", "#e45b4f"], ["#f08a3c", "#2b3338"]];
  for (let i = 0; i < 44; i++) {
    const x = -100 + br() * 270, z = -79 - br() * 34, lean = (br() - 0.5) * 0.5;
    if (Math.hypot(x - LIGHTHOUSE.x, z - LIGHTHOUSE.z) < (LIGHTHOUSE_ISLAND ? 19 : 10) || (x > -48 && x < -12 && z > -92) || (Math.abs(x + 6.5) < 4 && z > -80)) continue;
    if (x > SURF_SPOT.x - 6 && x < SURF_SPOT.x + 8 && z < SURF_SPOT.z && z > SURF_SPOT.z - 31) continue;
    const [a, b] = liveries[i % liveries.length];
    buoy(parts, x, -0.3, z, a, b, lean);
  }
  const buoys = new THREE.Mesh(colourMerge(parts), boatMat);
  buoys.name = "lobster-buoys";
  buoys.scale.set(1, 1.5, 1);
  buoys.userData.thin = true;
  group.add(buoys);
  updates.push((t) => { buoys.position.y = Math.sin(t * 1.1) * 0.06; });
}

/** The beach: pairs of painted chairs looking out to sea, driftwood, tufts of beach grass along the promenade. */
function addBeach(add: Add, col: Colliders) {
  const chair = (x: number, z: number, rot: number, c: string) => {
    const P = (g: THREE.BufferGeometry) => g.rotateY(rot).translate(x, 0, z);
    add(P(boxGeo(0.62, 0.06, 0.6, 0, 0.36, 0.02).rotateX(-0.14)), c);
    add(P(boxGeo(0.62, 0.95, 0.06, 0, 0, 0).rotateX(0.32).translate(0, 0.78, -0.42)), c);
    for (const s of [-1, 1]) { add(P(boxGeo(0.12, 0.05, 0.72, s * 0.38, 0.58, 0.02)), c); add(P(boxGeo(0.07, 0.56, 0.07, s * 0.36, 0.28, 0.3)), c); add(P(boxGeo(0.07, 0.4, 0.07, s * 0.36, 0.2, -0.3)), c); }
    col.addCircle(x, z, 0.42);
  };
  // (their backs to the town, facing the water: north)
  for (const [x, z, a, b] of [[18, -67.6, "#e45b4f", "#f6ecd9"], [52, -67.3, "#2a9d8f", "#f2c14e"], [-70, -67.8, "#f2c14e", "#4a7bb7"], [88, -67.2, "#f6ecd9", "#e45b4f"]] as [number, number, string, string][]) {
    chair(x - 0.62, z, Math.PI + 0.14, a); chair(x + 0.62, z + 0.05, Math.PI - 0.16, b);
    add(cylGeo(0.2, 0.2, 0.42, x, 0.21, z - 0.25, 8), "#9c6b43"); // a stump for a table between them
  }
  for (const [x, z, rot, len] of [[4, -69.0, 0.3, 2.6], [62, -69.4, -0.5, 2.0], [-90, -68.8, 1.2, 2.3]] as [number, number, number, number][]) {
    add(new THREE.CylinderGeometry(0.16, 0.2, len, 6).rotateZ(Math.PI / 2).rotateY(rot).translate(x, 0.16, z), "#b7a58c", { flat: true });
    add(new THREE.CylinderGeometry(0.07, 0.1, 0.8, 5).rotateZ(1.0).rotateY(rot + 0.8).translate(x + 0.3, 0.36, z + 0.1), "#b7a58c", { flat: true });
    col.addBox(x, z, Math.abs(Math.cos(rot)) * len + 0.3, Math.abs(Math.sin(rot)) * len + 0.3);
  }
  const gr = rand(204);
  const [supX, supZ] = SURF_SPOT.boards[1];
  for (let x = -104; x < 122; x += 3.4 + gr() * 3.2) {
    const z = BEACH_Z - 0.9 - gr() * 1.5;
    const n = 4 + Math.floor(gr() * 3);
    // Leave the two paddleboard decks and their 0.2 m margin clear. Keep the count draw for each tuft.
    if (Math.abs(x - supX) < 1.2 && Math.abs(z - supZ) < 1.75) continue;
    if (Math.abs(x + 30) < 5 || Math.hypot(x - 104, z + 70) < 5) continue;
    for (let i = 0; i < n; i++) add(new THREE.ConeGeometry(0.05, 0.55 + (i % 3) * 0.18, 3).rotateZ((i - n / 2) * 0.16).translate(x + (i - n / 2) * 0.09, 0.3, z + (i % 2) * 0.1), i % 2 ? "#b9b46a" : "#9fa85a", { flat: true, cast: false });
  }
}
